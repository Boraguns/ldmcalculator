import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useT, LanguageSwitcher } from '../i18n/LanguageContext';
import AccountMenu from '../components/AccountMenu';
import usePageMeta from '../hooks/usePageMeta';

/**
 * Public "Referanslar" gallery — a 6-column grid of customer/partner logos
 * managed from the admin panel. Each card shows the logo (or the company name
 * as a fallback) and links to the company website when one is provided.
 */
export default function References() {
    const { t } = useT();
    usePageMeta({
        title: t('references.metaTitle'),
        description: t('references.metaDesc'),
        canonical: 'https://ldmcalculator.com/references',
    });

    const [items, setItems] = useState(null);

    useEffect(() => {
        let cancelled = false;
        api('/api/public/references', { auth: false })
            .then((j) => { if (!cancelled) setItems(j.items || []); })
            .catch(() => { if (!cancelled) setItems([]); });
        return () => { cancelled = true; };
    }, []);

    // Logo card with the company name underneath. Not a link — the website is
    // intentionally not navigable from this gallery.
    const Card = ({ r }) => (
        <div title={r.name} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
                background: '#fff', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
                height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 16, boxSizing: 'border-box',
            }}>
                {r.logo_url
                    ? <img src={r.logo_url} alt={r.name}
                        style={{ maxWidth: '100%', maxHeight: 80, objectFit: 'contain' }} />
                    : <span style={{ color: '#334155', fontWeight: 600, fontSize: '0.95rem', textAlign: 'center' }}>{r.name}</span>}
            </div>
            <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500, textAlign: 'center' }}>{r.name}</span>
        </div>
    );

    return (
        <div style={{
            // Own scroll container: the global body is locked to 100vh/overflow:hidden.
            height: '100vh', width: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
            color: '#e2e8f0', boxSizing: 'border-box',
            padding: 'calc(env(safe-area-inset-top, 0px) + 20px) 24px calc(env(safe-area-inset-bottom, 0px) + 48px)',
        }}>
            <div style={{ position: 'fixed', top: 18, right: 18, zIndex: 200, display: 'flex', gap: 10, alignItems: 'center' }}>
                <AccountMenu height={40} compact />
                <LanguageSwitcher height={40} compact />
            </div>

            <div style={{ width: '100%', maxWidth: 1240, margin: '0 auto' }}>
                <div style={{ marginBottom: 24 }}>
                    <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem' }}>
                        ← {t('viewer.backHome')}
                    </Link>
                    <h1 style={{ color: '#f8fafc', fontSize: '1.9rem', margin: '12px 0 4px' }}>{t('references.title')}</h1>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>{t('references.subtitle')}</p>
                </div>

                {items === null ? (
                    <p style={{ color: '#94a3b8' }}>…</p>
                ) : items.length === 0 ? (
                    <p style={{ color: '#94a3b8' }}>{t('references.empty')}</p>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, 1fr)',
                        gap: 16,
                    }} className="references-grid">
                        {items.map((r) => <Card key={r.id} r={r} />)}
                    </div>
                )}
            </div>

            {/* Responsive column count without a separate CSS file. */}
            <style>{`
                @media (max-width: 1100px) { .references-grid { grid-template-columns: repeat(4, 1fr) !important; } }
                @media (max-width: 760px)  { .references-grid { grid-template-columns: repeat(3, 1fr) !important; } }
                @media (max-width: 480px)  { .references-grid { grid-template-columns: repeat(2, 1fr) !important; } }
            `}</style>
        </div>
    );
}
