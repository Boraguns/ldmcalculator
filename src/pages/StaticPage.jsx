// Lightweight wrapper used by the legal/about pages so we share styling
// (background, max width, link to home, footer) without duplicating layout.
import { Link } from 'react-router-dom';
import { useT, LanguageSwitcher } from '../i18n/LanguageContext';
import AccountMenu from '../components/AccountMenu';

const StaticPage = ({ title, children }) => {
    const { t } = useT();
    return (
        <div style={{
            minHeight: '100vh',
            width: '100%',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
            color: '#e2e8f0',
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 28px)',
            paddingBottom: '60px'
        }}>
            <div style={{ position: 'fixed', top: 18, right: 18, zIndex: 200, display: 'flex', gap: 10, alignItems: 'center' }}>
                <AccountMenu height={40} compact />
                <LanguageSwitcher height={40} compact />
            </div>
            <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 24px' }}>
                <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem' }}>
                    ← {t('viewer.backHome')}
                </Link>
                <h1 style={{ color: '#f8fafc', fontSize: '2rem', marginTop: 16, marginBottom: 18 }}>{title}</h1>
                <article style={{
                    background: 'rgba(15,23,42,0.6)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 14,
                    padding: '24px 28px',
                    lineHeight: 1.65
                }}>
                    {children}
                </article>
            </div>
        </div>
    );
};

export default StaticPage;
