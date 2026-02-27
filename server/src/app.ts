import express, { type Request, type Response, type NextFunction } from 'express'
import authRouter from './modules/auth/auth.router'
import connectionsRouter from './modules/connections/connections.router'
import projectsRouter from './modules/projects/projects.router'
import metadataRouter from './modules/metadata/metadata.router'
import erdRouter from './modules/erd/erd.router'
import { fail } from './lib/respond'
import { authMiddleware } from './lib/authMiddleware'

const app = express()

// JSON 바디 파싱
app.use(express.json())

// CORS: 프론트(3000) -> API(4000) 쿠키 포함 요청 허용
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
])
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  next()
})

// 라우터
app.use('/auth', authRouter)
app.use('/connections', authMiddleware, connectionsRouter)
app.use('/projects', authMiddleware, projectsRouter)
app.use('/metadata', authMiddleware, metadataRouter)
app.use('/erd', authMiddleware, erdRouter)

// 헬스 체크
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, env: process.env.APP_ENV ?? 'unknown' })
})

// 404
app.use((_req: Request, res: Response) => {
  fail(res, 404, '요청한 리소스를 찾을 수 없습니다.')
})

// 글로벌 에러 핸들러
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[app] unhandled error:', err.message)
  fail(res, 500, '서버 오류가 발생했습니다.')
})

export default app
