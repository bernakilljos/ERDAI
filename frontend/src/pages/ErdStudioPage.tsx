import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { TableNode } from '../components/erd/TableNode'
import { RelationEdge } from '../components/erd/RelationEdge'
import { FilterPanel } from '../components/erd/FilterPanel'
import { TableDetailDrawer } from '../components/erd/TableDetailDrawer'
import { DOMAIN_COLORS } from '../mock/erdMockData'
import type { ErdTable, ErdRelation, ConfidenceLevel, ErdView } from '../types/erd'
import type { Project, ProjectConnection } from '../types/project'
import { projectApi } from '../api/projectApi'
import { connectionApi } from '../api/connectionApi'
import { erdApi } from '../api/erdApi'
import { useErdGraph, type SyncProgress } from '../hooks/useErdGraph'
import { useAuth } from '../hooks/useAuth'
import '../styles/erd.css'

// Domain layout constants
const NODE_W = 280, NODE_H = 260
const GAP_X = 40,   GAP_Y = 40
const CLUSTER_GAP_X = 100, CLUSTER_GAP_Y = 160
const LABEL_H = 60

interface DomainLabelMeta {
  domain: string
  x: number
  y: number
  width: number
}

/**
 * 도메인 테이블 수에 따른 최적 열 수 (클러스터 내부).
 * √(count × 4) 수식 → 넓고 낮은 클러스터 (최대 50열).
 * 300개 도메인에서도 35열 수준으로 가로 우선 배치.
 */
function domainCols(count: number): number {
  if (count <= 1) return 1
  return Math.max(2, Math.min(50, Math.ceil(Math.sqrt(count * 4))))
}

/**
 * 도메인 수에 따라 캔버스 가로:세로 목표 비율을 조정.
 * 도메인이 많을수록 더 가로로 넓게 배치해 행 수를 줄임.
 *   ≤ 5  도메인 → 2.0 (소규모, 정사각 근접)
 *   ≤ 15 도메인 → 2.5
 *   ≤ 30 도메인 → 3.0
 *   31+  도메인 → 4.0 (대규모 1000+ 테이블)
 */
function adaptiveCanvasRatio(domainCount: number): number {
  if (domainCount <= 5)  return 2.0
  if (domainCount <= 15) return 2.5
  if (domainCount <= 30) return 3.0
  return 4.0
}

/**
 * ETC 도메인 테이블을 테이블명 prefix로 재분류.
 * 같은 prefix가 2개 이상이면 별도 도메인(prefix명)으로 승격.
 * e.g. log_access, log_error → 도메인 'LOG'
 */
function refineEtcDomain(tables: ErdTable[]): ErdTable[] {
  const etcTables = tables.filter(t => t.domain === 'ETC')
  if (etcTables.length === 0) return tables

  const prefixCount = new Map<string, number>()
  for (const t of etcTables) {
    const sep = t.name.indexOf('_')
    if (sep <= 0) continue
    const prefix = t.name.slice(0, sep).toUpperCase()
    prefixCount.set(prefix, (prefixCount.get(prefix) ?? 0) + 1)
  }

  return tables.map(t => {
    if (t.domain !== 'ETC') return t
    const sep = t.name.indexOf('_')
    if (sep <= 0) return t
    const prefix = t.name.slice(0, sep).toUpperCase()
    return (prefixCount.get(prefix) ?? 0) >= 2
      ? { ...t, domain: prefix }
      : t
  })
}

function computeDomainPositions(tables: ErdTable[]): {
  posMap: Map<string, { x: number; y: number }>
  labelMeta: DomainLabelMeta[]
} {
  const groups = new Map<string, ErdTable[]>()
  for (const t of tables) {
    if (!groups.has(t.domain)) groups.set(t.domain, [])
    groups.get(t.domain)!.push(t)
  }
  const sorted = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const n = sorted.length
  if (n === 0) return { posMap: new Map(), labelMeta: [] }

  // 1단계: 각 도메인 클러스터 크기 사전 계산
  const dims = sorted.map(([domain, domainTables]) => {
    const cols = domainCols(domainTables.length)
    const rows = Math.ceil(domainTables.length / cols)
    return {
      domain,
      tables: domainTables,
      cols,
      clusterW: cols * NODE_W + (cols - 1) * GAP_X,
      clusterH: LABEL_H + rows * NODE_H + (rows - 1) * GAP_Y,
    }
  })

  // 2단계: 평균 클러스터 크기 + 도메인 수 기반 적응형 비율로 최적 domainsPerRow 산출
  //   목표: (domainsPerRow × avgW) / (rows × avgH) ≈ canvasRatio
  //   → domainsPerRow = round(√(n × canvasRatio × avgH / avgW))
  const avgW = dims.reduce((s, d) => s + d.clusterW + CLUSTER_GAP_X, 0) / n
  const avgH = dims.reduce((s, d) => s + d.clusterH + CLUSTER_GAP_Y, 0) / n
  const canvasRatio = adaptiveCanvasRatio(n)
  const domainsPerRow = Math.max(1, Math.min(n, Math.round(Math.sqrt(n * canvasRatio * avgH / avgW))))

  // 3단계: 실제 배치
  const posMap = new Map<string, { x: number; y: number }>()
  const labelMeta: DomainLabelMeta[] = []
  let rowX = 0, rowY = 0, domainCol = 0, rowMaxH = 0

  for (const { domain, tables: domainTables, cols, clusterW, clusterH } of dims) {
    labelMeta.push({ domain, x: rowX, y: rowY, width: clusterW })

    domainTables.forEach((t, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      posMap.set(t.id, {
        x: rowX + col * (NODE_W + GAP_X),
        y: rowY + LABEL_H + row * (NODE_H + GAP_Y),
      })
    })

    rowMaxH = Math.max(rowMaxH, clusterH)
    rowX += clusterW + CLUSTER_GAP_X
    domainCol++

    if (domainCol >= domainsPerRow) {
      domainCol = 0
      rowX = 0
      rowY += rowMaxH + CLUSTER_GAP_Y
      rowMaxH = 0
    }
  }
  return { posMap, labelMeta }
}

// Domain label node — must be defined outside component to prevent re-registration
function DomainLabelNode({ data }: { data: { label: string; color: string; domain: string; width: number } }) {
  return (
    <div className="domain-label-node" style={{ background: data.color, width: data.width }}>
      {data.label}
    </div>
  )
}

// Must be defined outside component to prevent re-registration
const nodeTypes = { tableNode: TableNode, domainLabel: DomainLabelNode }
const edgeTypes = { relationEdge: RelationEdge }

export default function ErdStudioPage() {
  return (
    <ReactFlowProvider>
      <ErdStudioInner />
    </ReactFlowProvider>
  )
}

function ErdStudioInner() {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const reactFlow = useReactFlow()

  const [projects, setProjects] = useState<Project[]>([])
  const [connections, setConnections] = useState<ProjectConnection[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(routeProjectId ?? null)
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)

  const { user, logout } = useAuth()
  const { graph, isLoading, error, sync } = useErdGraph(selectedProjectId ?? undefined)

  // fitView를 노드 변경 후 안전하게 호출하기 위한 ref (deps 불필요)
  const reactFlowRef = useRef(reactFlow)
  useEffect(() => { reactFlowRef.current = reactFlow })

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const [view, setView] = useState<ErdView>('physical')
  const [selectedTable, setSelectedTable] = useState<ErdTable | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [enabledDomains, setEnabledDomains] = useState<Set<string>>(new Set())
  const [enabledConfidences, setEnabledConfidences] = useState<Set<ConfidenceLevel>>(
    () => new Set<ConfidenceLevel>(['FK', 'HIGH', 'MEDIUM'])
  )
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncStep, setSyncStep] = useState<SyncProgress | null>(null)
  const [exporting, setExporting] = useState<null | 'dbml' | 'mermaid'>(null)
  const [resetting, setResetting] = useState(false)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)

  const tables = graph?.tables ?? []
  const relations = graph?.relations ?? []

  // ETC 테이블을 prefix 기반 소그룹으로 재분류한 테이블 목록
  const refinedTables = useMemo(() => refineEtcDomain(tables), [tables])

  const allDomains = useMemo(
    () => [...new Set(refinedTables.map(t => t.domain))].sort(),
    [refinedTables]
  )

  useEffect(() => {
    setEnabledDomains(new Set(refinedTables.map(t => t.domain)))
    // 300개 이상 테이블: MEDIUM 엣지 기본 OFF (엣지 스파게티 방지)
    setEnabledConfidences(
      tables.length > 300
        ? new Set<ConfidenceLevel>(['FK', 'HIGH'])
        : new Set<ConfidenceLevel>(['FK', 'HIGH', 'MEDIUM'])
    )
  }, [refinedTables, tables.length])

  useEffect(() => {
    void (async () => {
      try {
        const [projectList, connectionList] = await Promise.all([
          projectApi.list(),
          connectionApi.list(),
        ])
        setProjects(projectList)
        setConnections(connectionList as ProjectConnection[])

        const fallbackProjectId = routeProjectId ?? projectList[0]?.id
        if (fallbackProjectId) {
          setSelectedProjectId(fallbackProjectId)
          if (!routeProjectId) {
            navigate(`/erd/${fallbackProjectId}`, { replace: true })
          }
        }
      } catch (err) {
        console.error('[erd] load failed:', err)
      }
    })()
  }, [navigate, routeProjectId])

  useEffect(() => {
    if (!selectedProjectId) return
    const list = connections.filter(c => c.projectId === selectedProjectId)
    setSelectedConnectionId(list[0]?.id ?? null)
  }, [connections, selectedProjectId])

  // Initialize RF state
  const [rfNodes, setRfNodes, onRfNodesChange] = useNodesState<Node>([])
  const [rfEdges, setRfEdges, onRfEdgesChange] = useEdgesState<Edge>([])

  useEffect(() => {
    const { posMap, labelMeta } = computeDomainPositions(refinedTables)

    const domainLabelNodes: Node[] = labelMeta.map(({ domain, x, y, width }) => ({
      id: `domain-label-${domain}`,
      type: 'domainLabel',
      position: { x, y },
      data: {
        label: domain,
        color: DOMAIN_COLORS[domain] ?? '#eeeeee',
        domain,
        width,
      },
      draggable: false,
      selectable: false,
      focusable: false,
      style: { pointerEvents: 'none' as const },
    }))

    setRfNodes([
      ...domainLabelNodes,
      ...refinedTables.map(t => ({
        id: t.id,
        type: 'tableNode',
        position: posMap.get(t.id) ?? { x: 0, y: 0 },
        data: { ...t, view: 'physical' as ErdView },
      })),
    ])
    setRfEdges(
      relations.map(r => ({
        id: r.id,
        source: r.sourceTable,
        target: r.targetTable,
        type: 'relationEdge',
        data: r as unknown as Record<string, unknown>,
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      }))
    )

    // 노드 배치 후 뷰를 새 데이터에 맞게 자동 조정 (프로젝트 전환 포함)
    if (refinedTables.length > 0) {
      const timer = setTimeout(() => {
        reactFlowRef.current.fitView({ padding: 0.12, duration: 400 })
      }, 80)
      return () => clearTimeout(timer)
    }
  }, [refinedTables, relations, setRfNodes, setRfEdges])

  // Compute neighbor IDs for focus mode
  const neighborIds = useMemo(() => {
    if (!focusedNodeId) return new Set<string>()
    const ids = new Set<string>()
    relations.forEach(r => {
      if (r.sourceTable === focusedNodeId) ids.add(r.targetTable)
      if (r.targetTable === focusedNodeId) ids.add(r.sourceTable)
    })
    return ids
  }, [focusedNodeId, relations])

  // Sync filters + view + focus -> RF nodes
  useEffect(() => {
    setRfNodes(nds =>
      nds.map(n => {
        // Domain label nodes: hide when domain is unchecked, never dim
        if (n.type === 'domainLabel') {
          const domain = (n.data as { domain: string }).domain
          return { ...n, hidden: !enabledDomains.has(domain) }
        }

        const t = n.data as unknown as ErdTable
        const nameMatch = t.name.toLowerCase().includes(searchTerm.toLowerCase())
        const commentMatch = t.comment.toLowerCase().includes(searchTerm.toLowerCase())
        const hidden =
          (!!searchTerm && !nameMatch && !commentMatch) ||
          !enabledDomains.has(t.domain)
        const dimmed =
          focusedNodeId !== null &&
          n.id !== focusedNodeId &&
          !neighborIds.has(n.id)
        return {
          ...n,
          hidden,
          data: { ...n.data, view },
          style: {
            opacity: dimmed ? 0.15 : 1,
            transition: 'opacity 0.2s',
          },
        }
      })
    )
  }, [searchTerm, enabledDomains, focusedNodeId, neighborIds, view, setRfNodes])

  // Sync filters + focus -> RF edges
  useEffect(() => {
    setRfEdges(eds =>
      eds.map(e => {
        const r = e.data as unknown as ErdRelation
        const hidden = !enabledConfidences.has(r.confidence)
        const dimmed =
          focusedNodeId !== null &&
          e.source !== focusedNodeId &&
          e.target !== focusedNodeId
        return {
          ...e,
          hidden,
          style: {
            opacity: dimmed ? 0.1 : 1,
            transition: 'opacity 0.2s',
          },
        }
      })
    )
  }, [enabledConfidences, focusedNodeId, setRfEdges])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'domainLabel') return
      const table = refinedTables.find(t => t.id === node.id)
      setSelectedTable(table ?? null)
    },
    [refinedTables]
  )

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'domainLabel') return
      const isSame = focusedNodeId === node.id
      setFocusedNodeId(isSame ? null : node.id)
      if (!isSame) {
        const neighbors: string[] = [node.id]
        relations.forEach(r => {
          if (r.sourceTable === node.id) neighbors.push(r.targetTable)
          if (r.targetTable === node.id) neighbors.push(r.sourceTable)
        })
        reactFlow.fitView({
          nodes: neighbors.map(id => ({ id })),
          duration: 500,
          padding: 0.3,
        })
      }
    },
    [focusedNodeId, relations, reactFlow]
  )

  const onPaneClick = useCallback(() => {
    setFocusedNodeId(null)
    setSelectedTable(null)
  }, [])

  // Persist node positions on drag
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onRfNodesChange(changes)
    },
    [onRfNodesChange]
  )

  const handleSync = async () => {
    if (!selectedProjectId) return
    setSyncing(true)
    setSyncStep(null)
    await sync(selectedConnectionId ?? undefined, (step) => {
      setSyncStep(step)
      if (step.step === 'done') {
        setTimeout(() => {
          setSyncStep(null)
          setSyncing(false)
        }, 1500)
      } else if (step.step === 'error') {
        setTimeout(() => {
          setSyncStep(null)
          setSyncing(false)
        }, 3000)
      }
    })
    // SSE 완료 후 fallback
    setSyncing(false)
  }

  const handleExport = async (format: 'dbml' | 'mermaid') => {
    if (!selectedProjectId) return
    setExporting(format)
    try {
      const text = format === 'dbml'
        ? await erdApi.exportDbml(selectedProjectId)
        : await erdApi.exportMermaid(selectedProjectId)
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `erd-${selectedProjectId}.${format === 'dbml' ? 'dbml' : 'mmd'}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[erd] export failed:', err)
    } finally {
      setExporting(null)
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    setCreatingProject(true)
    try {
      const created = await projectApi.create({
        projectName: newProjectName.trim(),
        description: newProjectDesc.trim() || undefined,
      })
      setProjects(prev => [...prev, created])
      setSelectedProjectId(created.id)
      navigate(`/erd/${created.id}`, { replace: true })
      setShowNewProjectModal(false)
      setNewProjectName('')
      setNewProjectDesc('')
    } catch (err) {
      console.error('[erd] create project failed:', err)
    } finally {
      setCreatingProject(false)
    }
  }

  const handleResetProject = async () => {
    if (!selectedProjectId) return
    const okConfirm = window.confirm('프로젝트의 스냅샷/ERD 그래프를 초기화할까요?')
    if (!okConfirm) return
    setResetting(true)
    try {
      await projectApi.reset(selectedProjectId)
      await sync(selectedConnectionId ?? undefined)
    } catch (err) {
      console.error('[erd] reset failed:', err)
    } finally {
      setResetting(false)
    }
  }

  const tableRelations = selectedTable
    ? relations.filter(
        r => r.sourceTable === selectedTable.id || r.targetTable === selectedTable.id
      )
    : []

  const currentConnections = selectedProjectId
    ? connections.filter(c => c.projectId === selectedProjectId)
    : []

  return (
    <div className="erd-studio">
      <header className="erd-header">
        <span className="erd-logo">ERDAI</span>

        <nav className="erd-header-nav">
          <button className="erd-nav-item" onClick={() => navigate('/connections')}>
            DB 연결
          </button>
          <span className="erd-nav-item erd-nav-item--active">ERD 스튜디오</span>
        </nav>

        <select
          className="erd-select"
          value={selectedProjectId ?? ''}
          onChange={e => {
            const next = e.target.value
            setSelectedProjectId(next)
            navigate(`/erd/${next}`, { replace: true })
          }}
        >
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.projectName}
            </option>
          ))}
        </select>

        <button
          className="erd-new-project-btn"
          onClick={() => setShowNewProjectModal(true)}
          title="새 프로젝트 만들기"
        >
          + 새 프로젝트
        </button>

        {currentConnections.length === 0 ? (
          <span className="erd-no-connection">
            연결 없음 —{' '}
            <button className="erd-no-connection__link" onClick={() => navigate('/connections')}>
              연결 추가
            </button>
          </span>
        ) : (
          <select
            className="erd-select"
            value={selectedConnectionId ?? ''}
            onChange={e => setSelectedConnectionId(e.target.value)}
          >
            {currentConnections.map(c => (
              <option key={c.id} value={c.id}>
                {c.connectionName ?? `${c.host}:${c.port}`}
              </option>
            ))}
          </select>
        )}

        <div className="erd-header-spacer" />

        <div className="erd-view-toggle">
          <button
            className={`erd-view-btn${view === 'physical' ? ' erd-view-btn--active' : ''}`}
            onClick={() => setView('physical')}
          >
            물리
          </button>
          <button
            className={`erd-view-btn${view === 'logical' ? ' erd-view-btn--active' : ''}`}
            onClick={() => setView('logical')}
          >
            논리
          </button>
        </div>

        <div className="erd-export">
          <button
            className="erd-export-btn"
            onClick={() => handleExport('dbml')}
            disabled={!!exporting}
          >
            {exporting === 'dbml' ? 'DBML 내보내는 중...' : 'DBML'}
          </button>
          <button
            className="erd-export-btn"
            onClick={() => handleExport('mermaid')}
            disabled={!!exporting}
          >
            {exporting === 'mermaid' ? 'Mermaid 내보내는 중...' : 'Mermaid'}
          </button>
          <button
            className="erd-reset-btn"
            onClick={handleResetProject}
            disabled={resetting}
          >
            {resetting ? '초기화 중...' : '프로젝트 초기화'}
          </button>
        </div>

        <button
          className={`erd-sync-btn${syncing ? ' erd-sync-btn--syncing' : ''}`}
          onClick={handleSync}
          disabled={syncing || isLoading}
        >
          {syncing ? '동기화 중...' : '동기화'}
        </button>

        <div className="erd-header-user">
          {user && (
            <span className="erd-header-username">{user.loginId}</span>
          )}
          <button className="erd-logout-btn" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </header>

      <div className="erd-body">
        <FilterPanel
          domains={allDomains}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          enabledDomains={enabledDomains}
          onDomainsChange={setEnabledDomains}
          enabledConfidences={enabledConfidences}
          onConfidencesChange={setEnabledConfidences}
        />

        <div className="erd-canvas">
          {error && (
            <div className="erd-empty erd-empty--error">
              ⚠ {error}
            </div>
          )}
          {!error && tables.length === 0 && !isLoading && (
            <div className="erd-empty">
              ERD 데이터가 없습니다. 동기화를 진행해주세요.
            </div>
          )}

          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onRfEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onPaneClick={onPaneClick}
            fitView
            fitViewOptions={{ padding: 0.12 }}
            minZoom={0.05}
            maxZoom={2.5}
          >
            <Background gap={20} color="#e0e0e0" />
            <Controls />
            <MiniMap
              nodeColor={n => {
                const t = n.data as unknown as ErdTable | undefined
                return DOMAIN_COLORS[t?.domain ?? 'ETC'] ?? '#eee'
              }}
            />
          </ReactFlow>

          {syncStep && (
            <div className="sync-overlay">
              <div className="sync-overlay__card">
                <div className="sync-progress-text">{syncStep.message}</div>
                <div className="sync-progress-bar">
                  <div
                    className={`sync-progress-fill${syncStep.step === 'error' ? ' sync-progress-fill--error' : syncStep.step === 'done' ? ' sync-progress-fill--done' : ''}`}
                    style={{ width: `${syncStep.progress}%` }}
                  />
                </div>
                <div className="sync-progress-pct">{syncStep.progress}%</div>
              </div>
            </div>
          )}

          {focusedNodeId && (
            <div className="erd-focus-hint">
              더블클릭으로 포커스 해제
            </div>
          )}
        </div>

        {selectedTable && (
          <TableDetailDrawer
            table={selectedTable}
            relations={tableRelations}
            onClose={() => setSelectedTable(null)}
          />
        )}
      </div>

      {showNewProjectModal && (
        <div className="modal-backdrop" onClick={() => setShowNewProjectModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">새 프로젝트</h2>
            <div className="field">
              <label htmlFor="newProjectName">프로젝트 이름 *</label>
              <input
                id="newProjectName"
                type="text"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="프로젝트 이름"
                disabled={creatingProject}
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="newProjectDesc">설명 (선택)</label>
              <input
                id="newProjectDesc"
                type="text"
                value={newProjectDesc}
                onChange={e => setNewProjectDesc(e.target.value)}
                placeholder="프로젝트 설명"
                disabled={creatingProject}
              />
            </div>
            <div className="modal-actions">
              <button
                className="modal-btn modal-btn--cancel"
                onClick={() => setShowNewProjectModal(false)}
                disabled={creatingProject}
              >
                취소
              </button>
              <button
                className="modal-btn modal-btn--confirm"
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || creatingProject}
              >
                {creatingProject ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
