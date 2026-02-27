import { promises as fs } from 'fs'
import path from 'path'
import type { ErdGraph } from '../types/erd'
import type { SchemaMetadata } from '../types/worker'

export interface UserRecord {
  id: string
  loginId: string
  password: string
  role: 'ADMIN' | 'USER' | 'VIEWER'
  mustChangePassword: boolean
  createdAt: string
  updatedAt: string
}

export interface ProjectRecord {
  id: string
  projectName: string
  description?: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface ConnectionRecord {
  id: string
  projectId: string
  connectionName: string
  dbType: 'mysql' | 'mssql' | 'oracle'
  host: string
  port: number
  database?: string
  serviceName?: string
  sid?: string
  username: string
  password: string
  createdAt: string
}

export interface SnapshotRecord {
  id: string
  projectId: string
  connectionId: string
  extractedAt: string
  schemaName: string
  tableCount: number
  columnCount: number
  fkCount: number
  tables: SchemaMetadata['tables']
}

export interface GraphRecord {
  id: string
  projectId: string
  extractedAt: string
  graph: ErdGraph
}

interface ProjectFile {
  project: ProjectRecord
  connections: ConnectionRecord[]
  snapshots: SnapshotRecord[]
  graphs: GraphRecord[]
}

interface UsersFile {
  users: UserRecord[]
}

class Mutex {
  private queue = Promise.resolve()

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const res = this.queue.then(fn, fn)
    this.queue = res.then(() => undefined, () => undefined)
    return res
  }
}

const dataRoot = path.resolve(process.cwd(), 'data')
const projectDir = path.join(dataRoot, 'projects')
const usersFile = path.join(dataRoot, 'users.json')

const now = () => new Date().toISOString()

const randId = () => {
  const rnd = Math.random().toString(36).slice(2, 10)
  return `${Date.now().toString(36)}${rnd}`
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true })
}

async function readJson<T>(p: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(p, 'utf8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function writeJsonAtomic(p: string, data: unknown) {
  const dir = path.dirname(p)
  const tmp = path.join(dir, `.${path.basename(p)}.tmp`)
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
  await fs.rename(tmp, p)
}

class JsonStore {
  private users: UserRecord[] = []
  private projects = new Map<string, ProjectFile>()
  private mutex = new Mutex()

  async init(): Promise<void> {
    await ensureDir(dataRoot)
    await ensureDir(projectDir)
    const users = await readJson<UsersFile>(usersFile, { users: [] })
    this.users = users.users

    const files = await fs.readdir(projectDir)
    for (const f of files) {
      if (!f.endsWith('.json')) continue
      const full = path.join(projectDir, f)
      const proj = await readJson<ProjectFile>(full, {
        project: {
          id: f.replace('.json', ''),
          projectName: 'unknown',
          description: '',
          ownerId: 'unknown',
          createdAt: now(),
          updatedAt: now(),
        },
        connections: [],
        snapshots: [],
        graphs: [],
      })
      this.projects.set(proj.project.id, proj)
    }
  }

  // Users
  async listUsers(): Promise<UserRecord[]> {
    return this.users
  }

  async findUserByLogin(loginId: string): Promise<UserRecord | null> {
    return this.users.find(u => u.loginId === loginId) ?? null
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.users.find(u => u.id === id) ?? null
  }

  async saveUser(user: UserRecord): Promise<void> {
    const idx = this.users.findIndex(u => u.id === user.id)
    if (idx >= 0) this.users[idx] = user
    else this.users.push(user)
    await writeJsonAtomic(usersFile, { users: this.users })
  }

  // Projects
  async listProjects(): Promise<ProjectRecord[]> {
    return [...this.projects.values()].map(p => p.project)
  }

  async getProject(projectId: string): Promise<ProjectRecord | null> {
    return this.projects.get(projectId)?.project ?? null
  }

  async createProject(input: Omit<ProjectRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectRecord> {
    return this.mutex.run(async () => {
      const id = randId()
      const project: ProjectRecord = {
        id,
        projectName: input.projectName,
        description: input.description ?? '',
        ownerId: input.ownerId,
        createdAt: now(),
        updatedAt: now(),
      }
      const file: ProjectFile = { project, connections: [], snapshots: [], graphs: [] }
      this.projects.set(id, file)
      await this.persistProject(id)
      return project
    })
  }

  async updateProject(projectId: string, patch: Partial<Pick<ProjectRecord, 'projectName' | 'description'>>): Promise<ProjectRecord | null> {
    return this.mutex.run(async () => {
      const file = this.projects.get(projectId)
      if (!file) return null
      if (patch.projectName !== undefined) file.project.projectName = patch.projectName
      if (patch.description !== undefined) file.project.description = patch.description
      file.project.updatedAt = now()
      await this.persistProject(projectId)
      return file.project
    })
  }

  // Connections
  async listConnections(): Promise<ConnectionRecord[]> {
    const all: ConnectionRecord[] = []
    this.projects.forEach(p => all.push(...p.connections))
    return all
  }

  async findConnectionById(connectionId: string): Promise<ConnectionRecord | null> {
    for (const p of this.projects.values()) {
      const found = p.connections.find(c => c.id === connectionId)
      if (found) return found
    }
    return null
  }

  async createConnection(projectId: string, data: Omit<ConnectionRecord, 'id' | 'createdAt' | 'projectId'>): Promise<ConnectionRecord | null> {
    return this.mutex.run(async () => {
      const file = this.projects.get(projectId)
      if (!file) return null
      const connection: ConnectionRecord = {
        id: randId(),
        projectId,
        connectionName: data.connectionName,
        dbType: data.dbType,
        host: data.host,
        port: data.port,
        database: data.database,
        serviceName: data.serviceName,
        sid: data.sid,
        username: data.username,
        password: data.password,
        createdAt: now(),
      }
      file.connections.push(connection)
      await this.persistProject(projectId)
      return connection
    })
  }

  async deleteConnection(connectionId: string): Promise<boolean> {
    return this.mutex.run(async () => {
      for (const [projectId, file] of this.projects.entries()) {
        const idx = file.connections.findIndex(c => c.id === connectionId)
        if (idx >= 0) {
          file.connections.splice(idx, 1)
          await this.persistProject(projectId)
          return true
        }
      }
      return false
    })
  }

  async updateConnection(connectionId: string, patch: { connectionName: string }): Promise<ConnectionRecord | null> {
    return this.mutex.run(async () => {
      for (const [projectId, file] of this.projects.entries()) {
        const conn = file.connections.find(c => c.id === connectionId)
        if (conn) {
          conn.connectionName = patch.connectionName
          await this.persistProject(projectId)
          return conn
        }
      }
      return null
    })
  }

  // Snapshots
  async addSnapshot(projectId: string, snapshot: Omit<SnapshotRecord, 'id'>): Promise<SnapshotRecord | null> {
    return this.mutex.run(async () => {
      const file = this.projects.get(projectId)
      if (!file) return null
      const record: SnapshotRecord = { ...snapshot, id: randId() }
      file.snapshots.push(record)
      await this.persistProject(projectId)
      return record
    })
  }

  async getLatestSnapshot(projectId: string): Promise<SnapshotRecord | null> {
    const file = this.projects.get(projectId)
    if (!file || file.snapshots.length === 0) return null
    return [...file.snapshots].sort((a, b) => b.extractedAt.localeCompare(a.extractedAt))[0]
  }

  // Graphs
  async addGraph(projectId: string, graph: Omit<GraphRecord, 'id'>): Promise<GraphRecord | null> {
    return this.mutex.run(async () => {
      const file = this.projects.get(projectId)
      if (!file) return null
      const record: GraphRecord = { ...graph, id: randId() }
      file.graphs.push(record)
      await this.persistProject(projectId)
      return record
    })
  }

  async getLatestGraph(projectId: string): Promise<GraphRecord | null> {
    const file = this.projects.get(projectId)
    if (!file || file.graphs.length === 0) return null
    return [...file.graphs].sort((a, b) => b.extractedAt.localeCompare(a.extractedAt))[0]
  }

  async resetProjectData(projectId: string): Promise<boolean> {
    return this.mutex.run(async () => {
      const file = this.projects.get(projectId)
      if (!file) return false
      file.snapshots = []
      file.graphs = []
      await this.persistProject(projectId)
      return true
    })
  }

  private async persistProject(projectId: string) {
    const file = this.projects.get(projectId)
    if (!file) return
    const p = path.join(projectDir, `${projectId}.json`)
    await writeJsonAtomic(p, file)
  }
}

export const jsonStore = new JsonStore()
