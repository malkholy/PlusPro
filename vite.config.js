import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/express-api': {
        target: 'https://sila.silasystem.com:7103',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/express-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('SP_Name', 'APIExprssControlOperation')
            proxyReq.setHeader('Accept', 'application/json')
            proxyReq.setHeader('Content-Type', 'application/json')
          })
        }
      },
      '/hr-api': {
        target: 'https://sila.silasystem.com:7103',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/hr-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('SP_Name', 'APIHRControlOperation')
            proxyReq.setHeader('Accept', 'application/json')
            proxyReq.setHeader('Content-Type', 'application/json')
          })
        }
      },
      '/journal-api': {
        target: 'https://sila.silasystem.com:7103',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/journal-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('SP_Name', 'APIPlusJournalOperation')
            proxyReq.setHeader('Accept', 'application/json')
            proxyReq.setHeader('Content-Type', 'application/json')
          })
        }
      },
      '/plus-api': {
        target: 'https://sila.silasystem.com:7103',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/plus-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('SP_Name', 'APIPlusOperation')
            proxyReq.setHeader('Accept', 'application/json')
            proxyReq.setHeader('Content-Type', 'application/json')
          })
        }
      },
      '/inv-api': {
        target: 'https://sila.silasystem.com:7103',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/inv-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('SP_Name', 'PLS.APIPlusInvOperation')
            proxyReq.setHeader('Accept', 'application/json')
            proxyReq.setHeader('Content-Type', 'application/json')
          })
        }
      },
      '/loading-api': {
        target: 'https://sila.silasystem.com:7103',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/loading-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('SP_Name', 'APIPlusLoadingOperation')
            proxyReq.setHeader('Accept', 'application/json')
            proxyReq.setHeader('Content-Type', 'application/json')
          })
        }
      },
      '/warehouse-request-api': {
        target: 'https://sila.silasystem.com:7103',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/warehouse-request-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('SP_Name', 'APIPlusWarehouseRequestOperation')
            proxyReq.setHeader('Accept', 'application/json')
            proxyReq.setHeader('Content-Type', 'application/json')
          })
        }
      },
      '/rma-api': {
        target: 'https://sila.silasystem.com:7103',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/rma-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('SP_Name', 'APIPlusRMAOperation')
            proxyReq.setHeader('Accept', 'application/json')
            proxyReq.setHeader('Content-Type', 'application/json')
          })
        }
      },
      '/api': {
        target: 'https://sila.silasystem.com:7103',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('SP_Name', 'APIPlusOperation')
            proxyReq.setHeader('Accept', 'application/json')
            proxyReq.setHeader('Content-Type', 'application/json')
          })
        }
      }
    }
  }
})
