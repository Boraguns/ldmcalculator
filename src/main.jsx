import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { registerSW } from 'virtual:pwa-register'

// PWA auto-update: the plugin's default injected register script only calls
// serviceWorker.register(), so after a deploy the NEW worker activated in the
// background but the open page kept running the OLD precached bundle until a
// second manual reload — users kept seeing stale versions. The virtual
// register in autoUpdate mode reloads the page once when the fresh worker
// takes control, so every visitor is on the latest build automatically.
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <LanguageProvider>
            <AuthProvider>
                <App />
            </AuthProvider>
        </LanguageProvider>
    </StrictMode>,
)
