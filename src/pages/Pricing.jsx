import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StaticPage from './StaticPage';
import { api } from '../utils/api';
import { useAuth } from '../auth/AuthContext';
import { useT } from '../i18n/LanguageContext';
import usePageMeta from '../hooks/usePageMeta';

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

    const subscribe = async (plan, tier) => {
        if (!user) { navigate('/register'); return; }
        if (plan === 'corporate' && (user.accountType !== 'corporate_admin')) {
            setErr(t('pricing.corporateOnlyAdmin'));
            return;
        }
        setErr(''); setBusy(`${plan}|${tier}`);
        try {
            const j = await api('/api/billing/checkout', { method: 'POST', body: { plan, period, tier, currency } });
            if (j.iframeUrl) window.location.href = j.iframeUrl;
        } catch (e) {
            setErr(t(`auth.err.${e.message}`) || t('auth.err.generic'));
        } finally { setBusy(''); }
    };

    const card = (children, highlight) => (
        <div style={{
            background: highlight ? 'rgba(59,130,246,0.12)' : 'rgba(15,23,42,0.6)',
            border: `1px solid ${highlight ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 14, padding: '22px 20px',
        }}>{children}</div>
    );

    const Btn = ({ plan, tier, label }) => (
        <button onClick={() => subscribe(plan, tier)} disabled={busy === `${plan}|${tier}`}
            style={{ width: '100%', height: 44, border: 'none', borderRadius: 9, marginTop: 14,
                background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            {busy === `${plan}|${tier}` ? '…' : label}
        </button>
    );

    const Toggle = ({ options, value, onChange }) => (
        <div style={{ display: 'inline-flex', border: '1px solid #334155', borderRadius: 9, overflow: 'hidden' }}>
            {options.map((o) => (
                <button key={o.id} onClick={() => onChange(o.id)} style={{
                    padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                    background: value === o.id ? '#3b82f6' : 'transparent', color: value === o.id ? '#fff' : '#94a3b8',
                }}>{o.label}</button>
            ))}
        </div>
    );

    return (
        <StaticPage title={t('pricing.title')}>
            <p style={{ color: '#94a3b8', marginTop: -6 }}>{t('pricing.subtitle')}</p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', margin: '18px 0 26px' }}>
                <Toggle value={period} onChange={setPeriod} options={[
                    { id: 'monthly', label: t('pricing.monthly') },
                    { id: 'yearly', label: t('pricing.yearly') },
                ]} />
                <Toggle value={currency} onChange={setCurrency} options={[
                    { id: 'TRY', label: '₺ TRY' }, { id: 'USD', label: '$ USD' }, { id: 'EUR', label: '€ EUR' },
                ]} />
                {period === 'yearly' && <span style={{ color: '#6ee7b7', fontSize: '0.85rem' }}>{t('pricing.yearlySave')}</span>}
            </div>

            {err && <p style={{ color: '#fca5a5', marginBottom: 16 }}>{err}</p>}

            {/* Individual */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 30 }}>
                {card(
                    <>
                        <h3 style={{ color: '#f8fafc', margin: '0 0 4px' }}>{t('pricing.free')}</h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', minHeight: 36 }}>{t('pricing.freeDesc')}</p>
                        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>{fmt(0)}</div>
                    </>
                )}
                {card(
                    <>
                        <h3 style={{ color: '#f8fafc', margin: '0 0 4px' }}>{t('pricing.individual')}</h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', minHeight: 36 }}>{t('pricing.individualDesc')}</p>
                        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>
                            {fmt(priceFor[`individual|x|${period}`] || 0)}
                            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 400 }}> / {t(`pricing.${period}`)}</span>
                        </div>
                        <Btn plan="individual" tier={null} label={t('pricing.subscribe')} />
                    </>,
                    true
                )}
            </div>

            {/* Corporate */}
            <h2 style={{ color: '#f8fafc', fontSize: '1.3rem', marginBottom: 6 }}>{t('pricing.corporate')}</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 16 }}>{t('pricing.corporateDesc')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
                {CORP_TIERS.map((tier) => (
                    <div key={tier}>
                        {card(
                            <>
                                <h3 style={{ color: '#f8fafc', margin: '0 0 2px' }}>{tier} {t('pricing.seats')}</h3>
                                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
                                    {fmt(priceFor[`corporate|${tier}|${period}`] || 0)}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>/ {t(`pricing.${period}`)}</div>
                                <Btn plan="corporate" tier={tier} label={t('pricing.choose')} />
                            </>
                        )}
                    </div>
                ))}
            </div>
        </StaticPage>
    );
}
