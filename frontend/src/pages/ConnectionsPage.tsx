import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import ConnectionForm from '../components/connections/ConnectionForm'
import { connectionApi } from '../api/connectionApi'
import { projectApi } from '../api/projectApi'
import type { SavedConnection } from '../types/connection'
import type { Project } from '../types/project'
import '../styles/connections.css'

export default function ConnectionsPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>()
  const [showGoToErd, setShowGoToErd] = useState(false)

  // 인라인 이름 편집 상태
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const loadConnections = async () => {
    try {
      const list = await connectionApi.list()
      setSavedConnections(list)
    } catch {
      // silent
    }
  }

  const handleSaveSuccess = () => {
    void loadConnections()
    setShowGoToErd(true)
  }

  useEffect(() => {
    void (async () => {
      try {
        const [projectList, connectionList] = await Promise.all([
          projectApi.list(),
          connectionApi.list(),
        ])
        setProjects(projectList)
        setSelectedProjectId(projectList[0]?.id)
        setSavedConnections(connectionList)
      } catch {
        // silent
      }
    })()
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 연결을 삭제할까요?')) return
    setDeletingId(id)
    try {
      await connectionApi.delete(id)
      setSavedConnections(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setDeletingId(null)
    }
  }

  const startEdit = (c: SavedConnection) => {
    setEditingId(c.id)
    setEditingName(c.connectionName ?? `${c.host}:${c.port}`)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const confirmEdit = async (id: string) => {
    const name = editingName.trim()
    if (!name) return
    setSavingId(id)
    try {
      const updated = await connectionApi.update(id, { connectionName: name })
      setSavedConnections(prev => prev.map(c => c.id === id ? { ...c, connectionName: updated.connectionName } : c))
      setEditingId(null)
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <span className="app-logo">ERDAI</span>
        <nav className="header-nav">
          <span className="nav-item active">DB 연결</span>
          <button
            className="nav-item"
            onClick={() => navigate(`/erd/${projects[0]?.id}`)}
            disabled={projects.length === 0}
          >
            ERD 스튜디오
          </button>
        </nav>
        <div className="header-right">
          {user && (
            <span className="header-user">
              {user.loginId}
              <span className={`role-badge role-${user.role.toLowerCase()}`}>
                {user.role}
              </span>
            </span>
          )}
          <button className="btn-logout" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="page-inner">
          {showGoToErd && (
            <div className="save-success-banner">
              연결 저장 완료!
              <button
                className="save-success-banner__btn"
                onClick={() => navigate(`/erd/${selectedProjectId ?? projects[0]?.id}`)}
              >
                ERD 스튜디오에서 동기화 →
              </button>
              <button
                className="save-success-banner__close"
                onClick={() => setShowGoToErd(false)}
                aria-label="닫기"
              >
                ×
              </button>
            </div>
          )}

          <ConnectionForm
            onSaveSuccess={handleSaveSuccess}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
          />

          {savedConnections.length > 0 && (
            <div className="saved-connections">
              <h3 className="saved-connections__title">저장된 연결</h3>
              <ul className="saved-connections__list">
                {savedConnections.map(c => (
                  <li key={c.id} className="saved-connections__item">
                    <div className="saved-connections__info">
                      {editingId === c.id ? (
                        <div className="saved-connections__edit-row">
                          <input
                            className="saved-connections__edit-input"
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') void confirmEdit(c.id)
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            autoFocus
                            disabled={savingId === c.id}
                          />
                          <button
                            className="saved-connections__edit-btn saved-connections__edit-btn--confirm"
                            onClick={() => void confirmEdit(c.id)}
                            disabled={savingId === c.id || !editingName.trim()}
                            title="저장"
                          >
                            ✓
                          </button>
                          <button
                            className="saved-connections__edit-btn saved-connections__edit-btn--cancel"
                            onClick={cancelEdit}
                            disabled={savingId === c.id}
                            title="취소"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span className="saved-connections__name-row">
                          <span className="saved-connections__name">
                            {c.connectionName ?? `${c.host}:${c.port}`}
                          </span>
                          <button
                            className="saved-connections__rename-btn"
                            onClick={() => startEdit(c)}
                            title="이름 변경"
                          >
                            ✏️
                          </button>
                        </span>
                      )}
                      <span className="saved-connections__meta">
                        {c.dbType.toUpperCase()} · {c.host}:{c.port}
                        {c.database ? ` · ${c.database}` : ''}
                      </span>
                    </div>
                    <button
                      className="saved-connections__del-btn"
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      title="연결 삭제"
                    >
                      {deletingId === c.id ? '삭제 중...' : '삭제'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
