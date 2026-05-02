import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['src/favicon.png'],
            manifest: {
                name: 'LDM Calculator',
                short_name: 'LDM Calc',
                description: 'Lojistik Yük Planlama Hesaplayıcısı - Tır, Tren, Uçak, Gemi',
                theme_color: '#0f172a',
                background_color: '#0f172a',
                display: 'standalone',
                orientation: 'any',
                start_url: '/',
                icons: [
                    {
                        src: '/src/favicon.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    {
                        src: '/src/favicon.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            },
            devOptions: {
                enabled: true
            }
        })
    ],
    server: {
        host: true
    },
    build: {
        sourcemap: false
    }
})
