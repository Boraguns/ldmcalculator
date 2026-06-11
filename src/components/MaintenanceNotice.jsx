import { useState } from 'react';
import { useT } from '../i18n/LanguageContext';

// One-time maintenance/update notice shown on the calculator page. Dismissal is
// remembered per user in localStorage; bump the version suffix to re-show it to
// everyone after a future change.
const STORAGE_KEY = 'ldm_maint_notice_v1';

export default function MaintenanceNotice() {
    const { t } = useT();
    const [open, setOpen] = useState(() => {
        try { return localStorage.getItem(STORAGE_KEY) !== '1'; } catch { return true; }
    });

    if (!open) return null;

    const close = () => {
        try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* private mode */ }
        setOpen(false);
    };

    return (
        <div
            onClick={close}
            style={{
                position: 'fixed', inset: 0, zIndex: 6000,
                background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                style={{
                    width: '100%', maxWidth: 460,
                    background: '#fffdf8', border: '1px solid #e7ded0', borderRadius: 16,
                    boxShadow: '0 20px 60px rgba(120,100,60,0.30)',
                    padding: '24px 22px', color: '#1e293b',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 26 }} aria-hidden="true">🛠️</span>
                    <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>{t('maintenance.title')}</h2>
                </div>
                <p style={{ margin: '0 0 20px', lineHeight: 1.6, fontSize: '0.92rem', color: '#334155', whiteSpace: 'pre-line' }}>
                    {t('maintenance.body')}
                </p>
                <button onClick={close} className="ai-btn ai-btn-primary" style={{ width: '100%', height: 44, padding: '2px' }}>
                    <div className="ai-btn-inner" style={{ background: '#3b82f6', color: '#fff' }}>{t('maintenance.ok')}</div>
                </button>
            </div>
        </div>
    );
}
