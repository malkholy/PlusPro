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
      '/query-api': {
        target: 'https://sila.silasystem.com:7103',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/query-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('SP_Name', 'APIPlusQueryOperation')
            proxyReq.setHeader('Accept', 'application/json')
            proxyReq.setHeader('Content-Type', 'application/json')
          })
        }
      },
      '/lookup-api': {
        target: 'https://sila.silasystem.com:7103',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/lookup-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('SP_Name', 'APIPlusLookupOperation')
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
