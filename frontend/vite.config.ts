import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/auth':        { target: 'http://localhost:4000', changeOrigin: true },
      '/connections': { target: 'http://localhost:4000', changeOrigin: true },
      '/projects':    { target: 'http://localhost:4000', changeOrigin: true },
      '/metadata':    { target: 'http://localhost:4000', changeOrigin: true },
      // SSE 스트리밍 지원: compress 비활성화, 응답 버퍼링 없음
      '/erd': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // SSE 응답은 chunked 전송 유지
            if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
              proxyRes.headers['transfer-encoding'] = 'chunked'
              delete proxyRes.headers['content-length']
            }
          })
        },
      },
      '/health':      { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
})
