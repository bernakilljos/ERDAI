import 'dotenv/config'
import app from './app'
import { bootstrap } from './lib/bootstrap'

const PORT = Number(process.env.API_PORT) || 4000

async function start() {
  await bootstrap()
  const server = app.listen(PORT, () => {
    const stub = process.env.WORKER_STUB === 'true'
    console.log(`[server] listening on :${PORT}  env=${process.env.APP_ENV ?? 'local'}`)
    if (stub) {
      console.log('[server] WORKER_STUB=true -> Python Worker 없이 stub 응답 반환')
    }
  })

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[server] 포트 ${PORT} 이미 사용 중입니다.`)
      console.error(`[server] 실행 중인 서버를 먼저 종료해주세요:`)
      console.error(`         PowerShell: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force`)
      process.exit(1)
    } else {
      throw err
    }
  })
}

start().catch(err => {
  console.error('[server] bootstrap failed:', err)
  process.exit(1)
})
