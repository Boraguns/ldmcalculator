import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../auth/AuthContext';
import { useT, LanguageSwitcher } from '../i18n/LanguageContext';
import AccountMenu from '../components/AccountMenu';
import usePageMeta from '../hooks/usePageMeta';
import { PROMO_FREE } from '../utils/promo';

const CUR_SYMBOL = { TRY: '₺', USD: '$', EUR: '€' };
const CORP_TIERS = [3, 5, 10, 20, 30, 50, 100];

export default function Pricing() {
    const { t } = useT();
    const { user } = useAuth();
    const navigate = useNavigate();
    usePageMeta({
        title: 'Pricing — Individual & Corporate Plans | LDMCalculator',
        description: 'LDMCalculator subscription plans for individuals and companies. Monthly or yearly, multiple currencies.',
        canonical: 'https://ldmcalculator.com/pricing',
    });

    const [currency, setCurrency] = useState('TRY');
    const [period, setPeriod] = useState('monthly');
    const [rows, setRows] = useState([]);
    const [busy, setBusy] = useState('');
    const [err, setErr] = useState('');
    const [msg, setMsg] = useState('');

    useEffect(() => {
        let cancelled = false;
        api(`/api/billing/plans?currency=${currency}`, { auth: false })
            .then((j) => { if (!cancelled) setRows(j.plans || []); })
            .catch(() => { if (!cancelled) setRows([]); });
        return () => { cancelled = true; };
    }, [currency]);

    const priceFor = useMemo(() => {
        const map = {};
        rows.forEach((r) => {
            const key = `${r.plan}|${r.tier == null ? 'x' : r.tier}|${r.period}`;
            map[key] = Number(r.amount);
        });
        return map;
    }, [rows]);

    const fmt = (n) => `${CUR_SYMBOL[currency] || ''}${(Number(n) || 0).toLocaleString()}`;

    // Limited-time launch promo: all paid plans are currently free. Original
    // prices are shown struck-through next to a "free now" badge.
    const PROMO = PROMO_FREE;
    const PriceTag = ({ amount, compact }) => {
        const original = Number(amount) || 0;
        return (
            <div style={{ marginBottom: compact ? 8 : 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: compact ? '1.25rem' : '1.6rem', fontWeight: 700, color: PROMO ? '#6ee7b7' : '#fff' }}>
                        {PROMO ? fmt(0) : fmt(original)}
                    </span>
                    {PROMO && original > 0 && (
                        <span style={{ fontSize: compact ? '0.85rem' : '1rem', color: '#94a3b8', textDecoration: 'line-through' }}>{fmt(original)}</span>
                    )}
                    <span style={{ fontSize: compact ? '0.72rem' : '0.82rem', color: '#94a3b8', fontWeight: 400 }}>/ {t(`pricing.${period}`)}</span>
                </div>
                {PROMO && (
                    <span style={{ display: 'inline-block', marginTop: 4, fontSize: compact ? '0.66rem' : '0.7rem', fontWeight: 800,
                        color: '#052e16', background: '#6ee7b7', borderRadius: 999, padding: '2px 9px', letterSpacing: '0.02em' }}>
                        {t('pricing.freeNow')}
                    </span>
                )}
            </div>
        );
    };

    const subscribe = async (plan, tier) => {
        if (!user) { navigate('/register'); return; }
        if (plan === 'corporate' && (user.accountType !== 'corporate_admin')) {
            setErr(t('pricing.corporateOnlyAdmin'));
            return;
        }
        setErr(''); setMsg(''); setBusy(`${plan}|${tier}`);
        try {
            const j = await api('/api/billing/checkout', { method: 'POST', body: { plan, period, tier, currency } });
            // Manual-approval mode (PayTR not live yet): the request is queued for
            // an admin to approve — no redirect, just confirm receipt.
            if (j.pending) { setMsg(t('pricing.requestReceived')); return; }
            if (j.iframeUrl) window.location.href = j.iframeUrl;
        } catch (e) {
            setErr(t(`auth.err.${e.message}`) || t('auth.err.generic'));
        } finally { setBusy(''); }
    };

    const card = (children, highlight, pad = '16px 16px', key) => (
        <div key={key} style={{
            background: highlight ? 'rgba(59,130,246,0.12)' : 'rgba(15,23,42,0.6)',
            border: `1px solid ${highlight ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 12, padding: pad, display: 'flex', flexDirection: 'column',
        }}>{children}</div>
    );

    const Btn = ({ plan, tier, label, compact }) => (
        <button onClick={() => subscribe(plan, tier)} disabled={busy === `${plan}|${tier}`}
            style={{ width: '100%', height: compact ? 36 : 42, border: 'none', borderRadius: 9, marginTop: 'auto',
                background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: compact ? '0.82rem' : '0.95rem' }}>
            {busy === `${plan}|${tier}` ? '…' : label}
        </button>
    );

    const Toggle = ({ options, value, onChange }) => (
        <div style={{ display: 'inline-flex', border: '1px solid #334155', borderRadius: 9, overflow: 'hidden' }}>
            {options.map((o) => (
                <button key={o.id} onClick={() => onChange(o.id)} style={{
                    padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                    background: value === o.id ? '#3b82f6' : 'transparent', color: value === o.id ? '#fff' : '#94a3b8',
                }}>{o.label}</button>
            ))}
        </div>
    );

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
            color: '#e2e8f0',
            display: 'flex', flexDirection: 'column',
            padding: 'calc(env(safe-area-inset-top, 0px) + 20px) 24px 24px',
        }}>
            <div style={{ position: 'fixed', top: 18, right: 18, zIndex: 200, display: 'flex', gap: 10, alignItems: 'center' }}>
                <AccountMenu height={40} compact />
                <LanguageSwitcher height={40} compact />
            </div>

            <div style={{ width: '100%', maxWidth: 1240, margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
                <div>
                    <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem' }}>
                        ← {t('viewer.backHome')}
                    </Link>
                    <h1 style={{ color: '#f8fafc', fontSize: '1.7rem', margin: '10px 0 2px' }}>{t('pricing.title')}</h1>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>{t('pricing.subtitle')}</p>
                </div>

                {PROMO && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                        padding: '12px 16px', borderRadius: 12,
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(59,130,246,0.14))',
                        border: '1px solid rgba(110,231,183,0.45)',
                    }}>
                        <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🎉</span>
                        <div>
                            <div style={{ color: '#6ee7b7', fontWeight: 800, fontSize: '1rem' }}>{t('pricing.promoTitle')}</div>
                            <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{t('pricing.promoDesc')}</div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Toggle value={period} onChange={setPeriod} options={[
                        { id: 'monthly', label: t('pricing.monthly') },
                        { id: 'yearly', label: t('pricing.yearly') },
                    ]} />
                    <Toggle value={currency} onChange={setCurrency} options={[
                        { id: 'TRY', label: '₺ TRY' }, { id: 'USD', label: '$ USD' }, { id: 'EUR', label: '€ EUR' },
                    ]} />
                    {period === 'yearly' && <span style={{ color: '#6ee7b7', fontSize: '0.85rem' }}>{t('pricing.yearlySave')}</span>}
                </div>

                {err && <p style={{ color: '#fca5a5', margin: 0 }}>{err}</p>}
                {msg && (
                    <p style={{
                        margin: 0, padding: '10px 14px', borderRadius: 9,
                        background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)',
                        color: '#6ee7b7', fontSize: '0.9rem',
                    }}>{msg}</p>
                )}

                {/* Individual + Free side by side */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                    {card(
                        <>
                            <h3 style={{ color: '#f8fafc', margin: '0 0 4px' }}>{t('pricing.free')}</h3>
                            <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '0 0 8px' }}>{t('pricing.freeDesc')}</p>
                            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff' }}>{fmt(0)}</div>
                        </>
                    )}
                    {card(
                        <>
                            <h3 style={{ color: '#f8fafc', margin: '0 0 4px' }}>{t('pricing.individual')}</h3>
                            <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '0 0 8px' }}>{t('pricing.individualDesc')}</p>
                            <PriceTag amount={priceFor[`individual|x|${period}`] || 0} />
                            <Btn plan="individual" tier={null} label={PROMO ? t('pricing.startFree') : t('pricing.subscribe')} />
                        </>,
                        true
                    )}
                </div>

                {/* Corporate */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                        <h2 style={{ color: '#f8fafc', fontSize: '1.15rem', margin: 0 }}>{t('pricing.corporate')}</h2>
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('pricing.corporateDesc')}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                        {CORP_TIERS.map((tier) => (
                            card(
                                <>
                                    <h3 style={{ color: '#f8fafc', margin: '0 0 2px', fontSize: '1rem' }}>{tier} {t('pricing.seats')}</h3>
                                    <PriceTag amount={priceFor[`corporate|${tier}|${period}`] || 0} compact />
                                    <Btn plan="corporate" tier={tier} label={t('pricing.choose')} compact />
                                </>,
                                false, '13px 13px', tier
                            )
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
