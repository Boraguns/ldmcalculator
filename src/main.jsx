import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <LanguageProvider>
            <AuthProvider>
                <App />
            </AuthProvider>
        </LanguageProvider>
    </StrictMode>,
)
