// Centered card layout shared by the login / register / reset / verify pages.
import { Link } from 'react-router-dom';
import { useT, LanguageSwitcher } from '../i18n/LanguageContext';

export default function AuthShell({ title, subtitle, children, footer, wide = false, bgImage = false }) {
    const { t } = useT();
    return (
        <div style={{
            // Own scroll container: the global `body` is locked to 100vh /
            // overflow:hidden for the calculator, so the auth pages must scroll
            // internally instead of relying on the body scrollbar.
            height: '100vh', width: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
            // When bgImage is on (login / register), layer the map image bottom-right
            // over the dark gradient — same treatment as the home SEO section.
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
            ...(bgImage ? {
                backgroundImage: 'url(/map-bg.jpg), linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
                backgroundRepeat: 'no-repeat, no-repeat',
                backgroundPosition: 'right bottom, center',
                backgroundSize: 'contain, cover',
            } : {}),
            color: '#e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center',
            // Top pad clears the fixed language switcher so it never overlaps the logo.
            padding: 'calc(env(safe-area-inset-top, 0px) + 72px) 20px calc(env(safe-area-inset-bottom, 0px) + 40px)',
        }}>
            <div style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 18px)', right: 18, zIndex: 200 }}>
                <LanguageSwitcher height={40} compact />
            </div>
            <Link to="/" style={{ marginBottom: 24, maxWidth: '70%' }}>
                <img src="/src/ldm-calculator-beyaz-logo.png" alt="LDM" style={{ width: 190, maxWidth: '100%', height: 'auto' }} />
            </Link>
            <div style={{
                width: '100%', maxWidth: wide ? 640 : 420,
                background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16, padding: '30px 28px',
            }}>
                <h1 style={{ color: '#f8fafc', fontSize: '1.5rem', margin: '0 0 6px', textAlign: 'center' }}>{title}</h1>
                {subtitle && <p style={{ color: '#94a3b8', textAlign: 'center', margin: '0 0 22px', fontSize: '0.92rem' }}>{subtitle}</p>}
                {children}
            </div>
            {footer && <div style={{ marginTop: 18, color: '#94a3b8', fontSize: '0.9rem' }}>{footer}</div>}
            <Link to="/" style={{ marginTop: 18, color: '#64748b', textDecoration: 'none', fontSize: '0.85rem' }}>
                ← {t('viewer.backHome')}
            </Link>
        </div>
    );
}

// Shared labelled text input.
export function Field({ label, type = 'text', value, onChange, placeholder, autoComplete, required }) {
    return (
        <label style={{ display: 'block', marginBottom: 14 }}>
            <span style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: 6 }}>
                {label}{required && <span style={{ color: '#f87171' }}> *</span>}
            </span>
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                autoComplete={autoComplete}
                style={{
                    width: '100%', boxSizing: 'border-box', height: 44, padding: '0 14px',
                    borderRadius: 9, border: '1px solid #334155', background: '#0b1220',
                    color: '#f1f5f9', fontSize: '0.95rem', outline: 'none',
                }}
            />
        </label>
    );
}

export function SubmitBtn({ children, loading, ...rest }) {
    return (
        <button
            type="submit"
            disabled={loading}
            style={{
                width: '100%', height: 46, border: 'none', borderRadius: 9, cursor: loading ? 'default' : 'pointer',
                background: loading ? '#1e3a8a' : '#3b82f6', color: '#fff', fontWeight: 600, fontSize: '0.98rem',
            }}
            {...rest}
        >
            {loading ? '…' : children}
        </button>
    );
}

export function ErrorMsg({ children }) {
    if (!children) return null;
    return (
        <div style={{
            background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.4)',
            color: '#fca5a5', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: '0.88rem',
        }}>{children}</div>
    );
}

export function OkMsg({ children }) {
    if (!children) return null;
    return (
        <div style={{
            background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.4)',
            color: '#6ee7b7', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: '0.88rem',
        }}>{children}</div>
    );
}
