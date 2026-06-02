import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../utils/api';
import { useT, LanguageSwitcher } from '../i18n/LanguageContext';
import usePageMeta from '../hooks/usePageMeta';

const CUR = { TRY: '₺', USD: '$', EUR: '€' };
const money = (a, c) => `${CUR[c] || ''}${(Number(a) || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

const Card = ({ children, style }) => (
    <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '20px 22px', ...style }}>{children}</div>
);

export default function Account() {
    const { t } = useT();
    const { user, subscription, loading, logout, refresh } = useAuth();
    const navigate = useNavigate();
    const { tab = 'overview' } = useParams();
    usePageMeta({ title: 'My Account | LDMCalculator', description: 'Manage your subscription, profile and history.' });

    useEffect(() => {
        if (!loading && !user) navigate('/login');
    }, [loading, user, navigate]);

    const isCorpAdmin = user?.accountType === 'corporate_admin';
    const tabs = [
        { id: 'overview', label: t('account.overview') },
        { id: 'profile', label: t('account.profile') },
        { id: 'history', label: t('account.history') },
        { id: 'documents', label: t('account.documents') },
        { id: 'payments', label: t('account.payments') },
        ...(isCorpAdmin ? [{ id: 'company', label: t('account.company') }] : []),
    ];

    if (loading || !user) return null;

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a,#1e293b 60%,#334155)', color: '#e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <Link to="/"><img src="/src/ldm-calculator-beyaz-logo.png" alt="LDM" style={{ width: 150 }} /></Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <LanguageSwitcher height={38} compact />
                    <button onClick={() => { logout(); navigate('/'); }} style={{ background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>
                        {t('account.logout')}
                    </button>
                </div>
            </div>

            <div style={{ maxWidth: 960, margin: '0 auto', padding: '26px 20px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180 }}>
                    {tabs.map((tb) => (
                        <button key={tb.id} onClick={() => navigate(`/account/${tb.id}`)} style={{
                            textAlign: 'left', padding: '11px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                            background: tab === tb.id ? '#3b82f6' : 'transparent', color: tab === tb.id ? '#fff' : '#94a3b8', fontWeight: 600,
                        }}>{tb.label}</button>
                    ))}
                </nav>

                <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {tab === 'overview' && <Overview user={user} subscription={subscription} />}
                    {tab === 'profile' && <Profile user={user} refresh={refresh} />}
                    {tab === 'history' && <History />}
                    {tab === 'documents' && <Documents />}
                    {tab === 'payments' && <Payments />}
                    {tab === 'company' && isCorpAdmin && <Company />}
                </div>
            </div>
        </div>
    );
}

function VerifyNotice() {
    const { t } = useT();
    const [state, setState] = useState('idle'); // idle | sending | sent | error
    const resend = async () => {
        setState('sending');
        try {
            await api('/api/auth/resend-verify', { method: 'POST' });
            setState('sent');
        } catch {
            setState('error');
        }
    };
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <p style={{ color: '#fbbf24', fontSize: '0.9rem', margin: 0 }}>⚠ {t('account.verifyPending')}</p>
            {state === 'sent' ? (
                <span style={{ color: '#34d399', fontSize: '0.85rem' }}>✓ {t('account.verifySent')}</span>
            ) : (
                <button onClick={resend} disabled={state === 'sending'} style={{
                    background: 'transparent', border: '1px solid #fbbf24', color: '#fbbf24',
                    borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                }}>
                    {state === 'sending' ? t('account.verifySending') : t('account.verifyResend')}
                </button>
            )}
            {state === 'error' && <span style={{ color: '#fca5a5', fontSize: '0.85rem' }}>{t('account.verifyError')}</span>}
        </div>
    );
}

function Overview({ user, subscription }) {
    const { t } = useT();
    const navigate = useNavigate();
    const [seats, setSeats] = useState(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        api('/api/account/subscription').then((j) => setSeats(j.seats)).catch(() => {});
    }, []);
    const cancel = async () => {
        if (!window.confirm(t('account.cancelConfirm'))) return;
        setBusy(true);
        try { await api('/api/billing/cancel', { method: 'POST' }); window.location.reload(); }
        finally { setBusy(false); }
    };
    const active = subscription && ['active', 'past_due'].includes(subscription.status);
    return (
        <>
            <Card>
                <h2 style={{ margin: '0 0 4px', color: '#f8fafc' }}>{t('account.welcome', { name: user.firstName || user.email })}</h2>
                {!user.emailVerified && <VerifyNotice />}
            </Card>
            <Card>
                <h3 style={{ marginTop: 0, color: '#f8fafc' }}>{t('account.subscription')}</h3>
                {active ? (
                    <>
                        <p style={{ margin: '6px 0' }}>
                            <strong style={{ textTransform: 'capitalize' }}>{subscription.plan}</strong>
                            {subscription.tier ? ` · ${subscription.tier} ${t('pricing.seats')}` : ''} · {t(`pricing.${subscription.period}`)}
                        </p>
                        <p style={{ margin: '6px 0', color: '#94a3b8' }}>{money(subscription.amount, subscription.currency)} · {t('account.renews')}: {fmtDate(subscription.current_period_end)}</p>
                        {seats && <p style={{ margin: '6px 0', color: '#94a3b8' }}>{t('account.seatUsage', { used: seats.used, total: seats.total })}</p>}
                        {subscription.cancel_at_period_end
                            ? <p style={{ color: '#fbbf24' }}>{t('account.willCancel')}</p>
                            : <button onClick={cancel} disabled={busy} style={{ marginTop: 8, background: 'transparent', border: '1px solid #7f1d1d', color: '#fca5a5', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>{t('account.cancel')}</button>}
                    </>
                ) : (
                    <>
                        <p style={{ color: '#94a3b8' }}>{t('account.noSubscription')}</p>
                        <button onClick={() => navigate('/pricing')} style={{ background: '#3b82f6', border: 'none', color: '#fff', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 600 }}>{t('account.choosePlan')}</button>
                    </>
                )}
            </Card>
        </>
    );
}

function Profile({ user, refresh }) {
    const { t } = useT();
    const [f, setF] = useState({ firstName: user.firstName, lastName: user.lastName, phone: user.phone || '' });
    const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
    const [pw, setPw] = useState({ current: '', password: '' });
    const [msg, setMsg] = useState('');
    const [pwMsg, setPwMsg] = useState('');

    const save = async (e) => {
        e.preventDefault(); setMsg('');
        try { await api('/api/account/profile', { method: 'PATCH', body: f }); await refresh(); setMsg(t('account.saved')); }
        catch { setMsg(t('auth.err.generic')); }
    };
    const changePw = async (e) => {
        e.preventDefault(); setPwMsg('');
        try { await api('/api/account/password', { method: 'POST', body: pw }); setPwMsg(t('account.pwChanged')); setPw({ current: '', password: '' }); }
        catch (e2) { setPwMsg(t(`auth.err.${e2.message}`) || t('auth.err.generic')); }
    };
    const inp = { width: '100%', boxSizing: 'border-box', height: 42, padding: '0 12px', borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: '#f1f5f9', marginBottom: 12 };
    return (
        <>
            <Card>
                <h3 style={{ marginTop: 0, color: '#f8fafc' }}>{t('account.profile')}</h3>
                <form onSubmit={save}>
                    <label style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{t('auth.email')}</label>
                    <input value={user.email} disabled style={{ ...inp, opacity: 0.6 }} />
                    <label style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{t('auth.firstName')}</label>
                    <input value={f.firstName} onChange={set('firstName')} style={inp} />
                    <label style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{t('auth.lastName')}</label>
                    <input value={f.lastName} onChange={set('lastName')} style={inp} />
                    <label style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{t('auth.phone')}</label>
                    <input value={f.phone} onChange={set('phone')} style={inp} />
                    <button style={{ background: '#3b82f6', border: 'none', color: '#fff', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600 }}>{t('account.save')}</button>
                    {msg && <span style={{ marginLeft: 12, color: '#6ee7b7' }}>{msg}</span>}
                </form>
            </Card>
            <Card>
                <h3 style={{ marginTop: 0, color: '#f8fafc' }}>{t('account.changePassword')}</h3>
                <form onSubmit={changePw}>
                    <input type="password" placeholder={t('account.currentPassword')} value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} style={inp} />
                    <input type="password" placeholder={t('auth.newPassword')} value={pw.password} onChange={(e) => setPw((p) => ({ ...p, password: e.target.value }))} style={inp} />
                    <button style={{ background: '#3b82f6', border: 'none', color: '#fff', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600 }}>{t('account.updatePassword')}</button>
                    {pwMsg && <span style={{ marginLeft: 12, color: '#6ee7b7' }}>{pwMsg}</span>}
                </form>
            </Card>
        </>
    );
}

function History() {
    const { t } = useT();
    const [rows, setRows] = useState(null);
    useEffect(() => { api('/api/account/history').then((j) => setRows(j.history || [])).catch(() => setRows([])); }, []);
    return (
        <Card>
            <h3 style={{ marginTop: 0, color: '#f8fafc' }}>{t('account.history')}</h3>
            {!rows ? <p style={{ color: '#94a3b8' }}>…</p> : rows.length === 0 ? <p style={{ color: '#94a3b8' }}>{t('account.empty')}</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead><tr style={{ color: '#94a3b8', textAlign: 'left' }}><th style={{ padding: '6px 4px' }}>{t('account.date')}</th><th>{t('account.type')}</th><th>{t('account.tool')}</th></tr></thead>
                    <tbody>{rows.map((r) => (
                        <tr key={r.id} style={{ borderTop: '1px solid #1f2937' }}>
                            <td style={{ padding: '8px 4px' }}>{fmtDate(r.created_at)}</td>
                            <td style={{ textTransform: 'capitalize' }}>{r.kind}</td>
                            <td>{r.tool || '—'}</td>
                        </tr>
                    ))}</tbody>
                </table>
            )}
        </Card>
    );
}

function Documents() {
    const { t } = useT();
    const [rows, setRows] = useState(null);
    useEffect(() => { api('/api/account/documents').then((j) => setRows(j.documents || [])).catch(() => setRows([])); }, []);
    return (
        <Card>
            <h3 style={{ marginTop: 0, color: '#f8fafc' }}>{t('account.documents')}</h3>
            {!rows ? <p style={{ color: '#94a3b8' }}>…</p> : rows.length === 0 ? <p style={{ color: '#94a3b8' }}>{t('account.empty')}</p> : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {rows.map((r) => (
                        <li key={r.id} style={{ borderTop: '1px solid #1f2937', padding: '10px 0', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{r.title || r.type}</span>
                            <span style={{ color: '#94a3b8' }}>{fmtDate(r.created_at)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

function Payments() {
    const { t } = useT();
    const [rows, setRows] = useState(null);
    useEffect(() => { api('/api/account/payments').then((j) => setRows(j.payments || [])).catch(() => setRows([])); }, []);
    return (
        <Card>
            <h3 style={{ marginTop: 0, color: '#f8fafc' }}>{t('account.payments')}</h3>
            {!rows ? <p style={{ color: '#94a3b8' }}>…</p> : rows.length === 0 ? <p style={{ color: '#94a3b8' }}>{t('account.empty')}</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead><tr style={{ color: '#94a3b8', textAlign: 'left' }}><th style={{ padding: '6px 4px' }}>{t('account.date')}</th><th>{t('account.amount')}</th><th>{t('account.status')}</th></tr></thead>
                    <tbody>{rows.map((r) => (
                        <tr key={r.id} style={{ borderTop: '1px solid #1f2937' }}>
                            <td style={{ padding: '8px 4px' }}>{fmtDate(r.paid_at || r.created_at)}</td>
                            <td>{money(r.amount, r.currency)}</td>
                            <td style={{ textTransform: 'capitalize' }}>{t(`account.pay_${r.status}`) || r.status}</td>
                        </tr>
                    ))}</tbody>
                </table>
            )}
        </Card>
    );
}

const CORP_TIERS = [3, 5, 10, 20, 30, 50, 100];

function Company() {
    const { t } = useT();
    const [data, setData] = useState(null);
    const [email, setEmail] = useState('');
    const [msg, setMsg] = useState('');
    const [newTier, setNewTier] = useState('');
    const [seatMsg, setSeatMsg] = useState('');
    const load = useCallback(() => {
        api('/api/company/members').then((j) => { setData(j); setNewTier(String(j.company?.seat_count || 3)); }).catch(() => setData({ members: [], company: null }));
    }, []);
    useEffect(() => { load(); }, [load]);
    const changeSeats = async () => {
        setSeatMsg('');
        try {
            const j = await api('/api/company/change-seats', { method: 'POST', body: { tier: parseInt(newTier, 10) } });
            if (j.iframeUrl) { window.location.href = j.iframeUrl; return; }
            setSeatMsg(t('account.seatsUpdated'));
            load();
        } catch (e2) { setSeatMsg(t(`auth.err.${e2.message}`) || t('auth.err.generic')); }
    };
    const invite = async (e) => {
        e.preventDefault(); setMsg('');
        try { await api('/api/company/invite', { method: 'POST', body: { email: email.trim() } }); setEmail(''); setMsg(t('account.inviteSent')); load(); }
        catch (e2) { setMsg(t(`auth.err.${e2.message}`) || t('auth.err.generic')); }
    };
    const remove = async (id) => {
        if (!window.confirm(t('account.removeMemberConfirm'))) return;
        try { await api(`/api/company/members?id=${id}`, { method: 'DELETE' }); load(); } catch { /* noop */ }
    };
    const inp = { flex: 1, height: 42, padding: '0 12px', borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: '#f1f5f9' };
    return (
        <>
            <Card>
                <h3 style={{ marginTop: 0, color: '#f8fafc' }}>{t('account.company')}</h3>
                {data?.company && (
                    <p style={{ color: '#94a3b8' }}>
                        <strong style={{ color: '#e2e8f0' }}>{data.company.name}</strong><br />
                        {t('account.seatUsage', { used: data.members?.length || 0, total: data.company.seat_count })}
                    </p>
                )}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                    <span style={{ color: '#cbd5e1', fontSize: '0.88rem' }}>{t('account.upgradeSeats')}:</span>
                    <select value={newTier} onChange={(e) => setNewTier(e.target.value)} style={{ height: 38, borderRadius: 8, background: '#0b1220', color: '#f1f5f9', border: '1px solid #334155', padding: '0 10px' }}>
                        {CORP_TIERS.map((s) => <option key={s} value={s}>{s} {t('pricing.seats')}</option>)}
                    </select>
                    <button onClick={changeSeats} style={{ background: '#3b82f6', border: 'none', color: '#fff', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontWeight: 600 }}>{t('account.apply')}</button>
                </div>
                {seatMsg && <p style={{ color: '#6ee7b7', marginBottom: 0 }}>{seatMsg}</p>}
            </Card>
            <Card>
                <h3 style={{ marginTop: 0, color: '#f8fafc' }}>{t('account.inviteMember')}</h3>
                <form onSubmit={invite} style={{ display: 'flex', gap: 10 }}>
                    <input type="email" placeholder={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} style={inp} />
                    <button style={{ background: '#3b82f6', border: 'none', color: '#fff', borderRadius: 8, padding: '0 18px', cursor: 'pointer', fontWeight: 600 }}>{t('account.invite')}</button>
                </form>
                {msg && <p style={{ color: '#6ee7b7', marginBottom: 0 }}>{msg}</p>}
            </Card>
            <Card>
                <h3 style={{ marginTop: 0, color: '#f8fafc' }}>{t('account.members')}</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {(data?.members || []).map((m) => (
                        <li key={m.id} style={{ borderTop: '1px solid #1f2937', padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{m.first_name} {m.last_name} <span style={{ color: '#64748b' }}>· {m.email}</span> {m.account_type === 'corporate_admin' && <em style={{ color: '#60a5fa' }}>({t('account.admin')})</em>}</span>
                            {m.account_type !== 'corporate_admin' && <button onClick={() => remove(m.id)} style={{ background: 'transparent', border: '1px solid #7f1d1d', color: '#fca5a5', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>{t('account.remove')}</button>}
                        </li>
                    ))}
                </ul>
            </Card>
        </>
    );
}
