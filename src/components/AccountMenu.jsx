import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { useUsage } from '../usage/UsageContext';

/**
 * Auth-aware account control for the site header. Mirrors the visual language
 * of <ToolsMenu /> / <LanguageSwitcher /> (ai-btn shell, dark #1a1a1a inner).
 *
 *  - Logged OUT → a "Sign in" button that also offers "Sign up" in a dropdown.
 *  - Logged IN  → an avatar (initial) + first name, dropdown with My account,
 *                 Subscription, and Log out.
 *
 * Opens on hover (desktop) and click/tap (touch), closing on outside click.
 */
const AccountMenu = ({ style = {}, compact = false, height }) => {
    const { t } = useT();
    const navigate = useNavigate();
    const { user, loading, logout } = useAuth();
    const { status, checkStatus } = useUsage();
    const h = height ?? (compact ? 40 : 48);

    // Refresh the quota whenever the auth state flips (login/logout) and on
    // first mount, so the tier badge + trial-count border stay accurate. Each
    // consumed document also pushes a fresh status into this shared context.
    useEffect(() => { checkStatus(); }, [user, checkStatus]);
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    const closeTimer = useRef(null);

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
    const closeSoon = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setOpen(false), 160);
    };

    const go = (path) => { setOpen(false); navigate(path); };
    const doLogout = async () => { setOpen(false); try { await logout(); } catch { /* noop */ } navigate('/'); };

    // Avoid flashing the logged-out button while the initial /me check runs.
    if (loading) {
        return (
            <div style={{ ...style }}>
                <div className="ai-btn ai-language-switcher" style={{ padding: '2px', height: `${h}px`, opacity: 0.6 }}>
                    <div className="ai-btn-inner" style={{ padding: '0 16px', height: '100%', background: '#1a1a1a', borderRadius: 10, display: 'flex', alignItems: 'center' }}>
                        <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', display: 'inline-block', animation: 'ldmspin 0.7s linear infinite' }} />
                    </div>
                </div>
                <style>{'@keyframes ldmspin{to{transform:rotate(360deg)}}'}</style>
            </div>
        );
    }

    const loggedIn = !!user;
    const initial = (user?.firstName || user?.email || '?').trim().charAt(0).toUpperCase();
    const fontSize = compact ? '0.85rem' : '0.95rem';

    // Subscription tier + remaining trial allowance, derived from the usage
    // quota. `unlimited` is only ever true for an active paid subscriber.
    const isPremium = status?.unlimited === true;
    const remaining = typeof status?.remaining === 'number' ? status.remaining : null;
    // Coloured ring around the button that counts the free trials down:
    // green (2+) → orange (1) → red (0). Premium users get no ring.
    const ring = (!isPremium && remaining !== null)
        ? (remaining >= 2 ? '#22c55e' : remaining === 1 ? '#f59e0b' : '#ef4444')
        : null;
    const ringTitle = ring ? t('account.trialsLeft', { n: remaining }) : undefined;
    // The little tier line shown under the username (logged-in users only).
    const tierLabel = loggedIn
        ? (isPremium ? t('account.tierPremium') : t('account.tierFree'))
        : null;
    const tierColor = isPremium ? '#fbbf24' : '#94a3b8';

    const menuItems = loggedIn
        ? [
            { key: 'myAccount', label: t('nav.myAccount'), onClick: () => go('/account') },
            { key: 'subscription', label: t('account.subscription'), onClick: () => go('/account/payments') },
            { key: 'logout', label: t('account.logout'), onClick: doLogout, danger: true },
        ]
        : [
            { key: 'signIn', label: t('nav.signIn'), onClick: () => go('/login') },
            { key: 'signUp', label: t('nav.signUp'), onClick: () => go('/register') },
        ];

    return (
        <div
            ref={wrapRef}
            onMouseEnter={openNow}
            onMouseLeave={closeSoon}
            style={{ position: 'relative', ...style }}
        >
            <div
                className="ai-btn ai-language-switcher"
                onClick={() => (loggedIn ? setOpen(o => !o) : go('/login'))}
                style={{
                    padding: '2px', height: `${h}px`, cursor: 'pointer',
                    borderRadius: 12,
                    // Trial users get a countdown ring; premium users get a gold
                    // border matching the "Premium" tier text colour.
                    boxShadow: ring ? `0 0 0 2px ${ring}` : (isPremium ? `0 0 0 2px ${tierColor}` : undefined),
                    transition: 'box-shadow .2s',
                }}
            >
                <div
                    className="ai-btn-inner"
                    style={{
                        padding: '0 14px',
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#1a1a1a',
                        borderRadius: '10px',
                        color: '#fff',
                        fontFamily: 'inherit',
                        fontSize,
                        fontWeight: 500,
                        whiteSpace: 'nowrap'
                    }}
                >
                    {loggedIn ? (
                        <>
                            <span
                                aria-hidden="true"
                                style={{
                                    width: 24, height: 24, borderRadius: '50%',
                                    background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                                    color: '#fff', fontWeight: 700, fontSize: '0.8rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}
                            >{initial}</span>
                            {!compact && (
                                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.15 }}>
                                    <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {user.firstName || user.email}
                                    </span>
                                    {tierLabel && (
                                        <span style={{ fontSize: '0.62rem', fontWeight: 600, color: tierColor, letterSpacing: '.2px', whiteSpace: 'nowrap' }}>
                                            {tierLabel}
                                        </span>
                                    )}
                                </span>
                            )}
                            <svg
                                width="14" height="14" viewBox="0 0 24 24" fill="none"
                                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            <span>{t('nav.signIn')}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Trial-count badge: a small button-style pill pinned to the
                button's top-right corner, coloured green/orange/red as the free
                allowance counts down. Replaces the old hover tooltip. Hidden for
                premium (unlimited) users. */}
            {ring && (
                <span
                    aria-label={ringTitle}
                    title={ringTitle}
                    style={{
                        position: 'absolute',
                        top: -12,
                        right: -6,
                        minWidth: 20,
                        height: 20,
                        padding: '0 6px',
                        borderRadius: 999,
                        background: ring,
                        color: '#fff',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        lineHeight: '18px',
                        textAlign: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
                        border: '2px solid #0f0f0f',
                        pointerEvents: 'none',
                        zIndex: 2,
                    }}
                >
                    {remaining}
                </span>
            )}

            {/* "Go premium" caption under the button for everyone who is not yet a
                premium subscriber (logged-out + free/trial users). Links to the
                pricing page. Absolutely positioned so it doesn't shift the header
                row; hidden while the dropdown is open. */}
            {!isPremium && !open && (
                <button
                    onClick={(e) => { e.stopPropagation(); go('/pricing'); }}
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
                        border: 'none',
                        color: '#1f1300',
                        fontFamily: 'inherit',
                        fontSize: compact ? '0.66rem' : '0.7rem',
                        fontWeight: 800,
                        letterSpacing: '.2px',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        padding: '3px 11px',
                        borderRadius: 999,
                        boxShadow: '0 3px 9px rgba(245,158,11,0.45)',
                        zIndex: 1,
                    }}
                >
                    ★ {t('nav.goPremium')}
                </button>
            )}

            {open && (
                <div
                    role="menu"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        minWidth: '190px',
                        background: '#1a1a1a',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '12px',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
                        padding: '6px',
                        zIndex: 1000
                    }}
                >
                    {loggedIn && (
                        <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 4 }}>
                            <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                        </div>
                    )}
                    {menuItems.map(it => (
                        <button
                            key={it.key}
                            role="menuitem"
                            onClick={it.onClick}
                            style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                background: 'transparent',
                                border: 'none',
                                color: it.danger ? '#fca5a5' : '#e2e8f0',
                                fontFamily: 'inherit',
                                fontSize: compact ? '0.85rem' : '0.92rem',
                                fontWeight: 500,
                                padding: '10px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = it.danger ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.18)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            {it.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AccountMenu;
