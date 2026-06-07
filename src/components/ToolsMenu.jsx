import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n/LanguageContext';

/**
 * Tools dropdown — mirrors the visual language of <LanguageSwitcher /> (the
 * ai-btn shell with a dark #1a1a1a inner). Opens on hover (desktop) and on
 * click/tap (touch). Lists the document tools: CMR, Invoice, Çeki Listesi.
 */
const ToolsMenu = ({ style = {}, compact = false, height }) => {
    const { t } = useT();
    const navigate = useNavigate();
    const h = height ?? (compact ? 40 : 48);
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    const closeTimer = useRef(null);

    // Close on outside click (covers the tap-to-open path on touch devices).
    useEffect(() => {
        const onDocClick = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    const openNow = () => {
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
        setOpen(true);
    };
    // Small grace delay so moving the cursor from the button into the menu
    // (across the gap) doesn't snap it shut.
    const closeSoon = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setOpen(false), 160);
    };

    const items = [
        { key: 'cmr',         path: '/tools/cmr' },
        { key: 'invoice',     path: '/tools/invoice' },
        { key: 'packingList', path: '/tools/packing-list' }
    ];

    const go = (path) => { setOpen(false); navigate(path); };

    return (
        <div
            ref={wrapRef}
            onMouseEnter={openNow}
            onMouseLeave={closeSoon}
            style={{ position: 'relative', ...style }}
        >
            <div
                className="ai-btn ai-language-switcher"
                onClick={() => setOpen(o => !o)}
                style={{ padding: '2px', height: `${h}px`, cursor: 'pointer' }}
            >
                <div
                    className="ai-btn-inner"
                    style={{
                        padding: `0 16px`,
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#1a1a1a',
                        borderRadius: '10px',
                        color: '#fff',
                        fontFamily: 'inherit',
                        fontSize: compact ? '0.85rem' : '0.95rem',
                        fontWeight: 500,
                        whiteSpace: 'nowrap'
                    }}
                >
                    <span aria-hidden="true">🛠️</span>
                    <span>{t('tools.label')}</span>
                    <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </div>
            </div>

            {open && (
                <div
                    role="menu"
                    style={{
                        position: 'absolute',
                        top: `calc(100% + 8px)`,
                        // This is the left-most header button, so anchoring the
                        // dropdown to the right edge makes it grow leftward and
                        // overflow off-screen on mobile. Open it down-right
                        // (left:0) on compact/mobile; keep right-aligned on desktop.
                        ...(compact ? { left: 0, right: 'auto' } : { right: 0 }),
                        minWidth: '210px',
                        maxWidth: 'calc(100vw - 32px)',
                        background: '#1a1a1a',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '12px',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
                        padding: '6px',
                        zIndex: 1000
                    }}
                >
                    {items.map(it => (
                        <button
                            key={it.key}
                            role="menuitem"
                            onClick={() => go(it.path)}
                            style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                background: 'transparent',
                                border: 'none',
                                color: '#e2e8f0',
                                fontFamily: 'inherit',
                                fontSize: compact ? '0.85rem' : '0.92rem',
                                fontWeight: 500,
                                padding: '10px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.18)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            {t(`tools.${it.key}`)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ToolsMenu;
