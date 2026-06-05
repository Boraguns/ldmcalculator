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
            // Light theme with the wide map photo anchored to the bottom centre,
            // mirroring the profile / pricing pages.
            backgroundColor: '#f0f0f0',
            backgroundImage: 'url(/wide-bg.jpg)',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center bottom',
            backgroundSize: 'cover',
            backgroundAttachment: 'fixed',
            color: '#1e293b',
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 28px)',
            paddingBottom: '60px'
        }}>
            <div style={{ position: 'fixed', top: 18, right: 18, zIndex: 200, display: 'flex', gap: 10, alignItems: 'center' }}>
                <AccountMenu height={40} compact />
                <LanguageSwitcher height={40} compact />
            </div>
            <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 24px' }}>
                <Link to="/" style={{ color: '#475569', textDecoration: 'none', fontSize: '0.9rem' }}>
                    ← {t('viewer.backHome')}
                </Link>
                <h1 style={{ color: '#0f172a', fontSize: '2rem', marginTop: 16, marginBottom: 18 }}>{title}</h1>
                <article style={{
                    background: 'rgba(255,255,255,0.9)',
                    border: '1px solid #e7ded0',
                    borderRadius: 14,
                    padding: '24px 28px',
                    lineHeight: 1.65,
                    boxShadow: '0 6px 18px rgba(120,100,60,0.10)'
                }}>
                    {children}
                </article>
            </div>
        </div>
    );
};

export default StaticPage;
