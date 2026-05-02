import { useEffect, useState } from 'react';

// Single-file admin console. Login form on top; once authenticated, four tabs:
// flag-companies CRUD, banner image URLs, contact + advertise + screenshot logs.
// JWT lives in localStorage under 'ldm_admin_token'.

const TOKEN_KEY = 'ldm_admin_token';
const inputS = { width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', color: '#f1f5f9', borderRadius: 8, padding: '8px 10px', fontSize: '0.9rem', fontFamily: 'inherit' };
const cardS  = { background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 14, marginBottom: 12 };

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ''}` });

const Login = ({ onAuthed }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [err, setErr] = useState('');
    const submit = async (e) => {
        e.preventDefault();
        setErr('');
        try {
            const r = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || 'login failed');
            localStorage.setItem(TOKEN_KEY, j.token);
            onAuthed(j.user);
        } catch (e) { setErr(e.message); }
    };
    return (
        <form onSubmit={submit} style={{ maxWidth: 360, margin: '80px auto', display: 'grid', gap: 10 }}>
            <h1 style={{ color: '#f8fafc', textAlign: 'center', margin: 0 }}>Admin</h1>
            <input style={inputS} type="email" placeholder="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input style={inputS} type="password" placeholder="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="submit" className="ai-btn ai-btn-primary" style={{ height: 44 }}>
                <div className="ai-btn-inner" style={{ background: '#3b82f6', color: 'white' }}>Sign in</div>
            </button>
            {err && <div style={{ color: '#ef4444', textAlign: 'center' }}>{err}</div>}
        </form>
    );
};

// All flag codes that the 3D scene currently displays. Source of truth is
// ModelViewer.jsx → keep in sync if the wall grid changes.
const FLAG_CODES = [
    { code: 'tr', label: 'Türkiye' },           { code: 'de', label: 'Germany' },
    { code: 'fr', label: 'France' },            { code: 'nl', label: 'Netherlands' },
    { code: 'it', label: 'Italy' },             { code: 'be', label: 'Belgium' },
    { code: 'es', label: 'Spain' },             { code: 'gb', label: 'United Kingdom' },
    { code: 'at', label: 'Austria' },           { code: 'ch', label: 'Switzerland' },
    { code: 'pl', label: 'Poland' },            { code: 'ro', label: 'Romania' },
    { code: 'cz', label: 'Czech Republic' },    { code: 'se', label: 'Sweden' },
    { code: 'no', label: 'Norway' },            { code: 'dk', label: 'Denmark' },
    { code: 'gr', label: 'Greece' },            { code: 'pt', label: 'Portugal' },
    { code: 'hu', label: 'Hungary' },           { code: 'bg', label: 'Bulgaria' },
    { code: 'cn', label: 'China' },             { code: 'kz', label: 'Kazakhstan' },
    { code: 'tm', label: 'Turkmenistan' },      { code: 'uz', label: 'Uzbekistan' },
    { code: 'jp', label: 'Japan' },             { code: 'kr', label: 'South Korea' },
    { code: 'in', label: 'India' },             { code: 'id', label: 'Indonesia' },
    { code: 'vn', label: 'Vietnam' },           { code: 'th', label: 'Thailand' }
];

const FlagCompanies = () => {
    const [rows, setRows] = useState([]);
    const [draft, setDraft] = useState({ country_code: 'tr', name: '', description: '', logo_url: '', website: '', is_featured: false, sort_order: 0 });
    const [busy, setBusy] = useState(false);
    const [feedback, setFeedback] = useState(null); // { type: 'ok'|'err', text }
    const load = async () => {
        const r = await fetch('/api/admin/flag-companies', { headers: auth() });
        const j = await r.json();
        setRows(j.items || []);
    };
    useEffect(() => { load(); }, []);
    const create = async () => {
        if (!draft.name.trim()) {
            setFeedback({ type: 'err', text: 'Firma adı zorunlu' });
            return;
        }
        setBusy(true);
        setFeedback(null);
        try {
            const r = await fetch('/api/admin/flag-companies', {
                method: 'POST',
                headers: { ...auth(), 'Content-Type': 'application/json' },
                body: JSON.stringify(draft)
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) {
                setFeedback({ type: 'err', text: j.error || `Hata: HTTP ${r.status}` });
                return;
            }
            setDraft({ country_code: 'tr', name: '', description: '', logo_url: '', website: '', is_featured: false, sort_order: 0 });
            await load();
            setFeedback({ type: 'ok', text: `Eklendi: ${j.item?.country_code?.toUpperCase()} — ${j.item?.name}` });
            setTimeout(() => setFeedback(null), 3000);
        } catch (e) {
            setFeedback({ type: 'err', text: e.message || 'Network error' });
        } finally {
            setBusy(false);
        }
    };
    const update = async (item) => {
        await fetch('/api/admin/flag-companies', { method: 'PATCH', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
        load();
    };
    const remove = async (id) => {
        if (!confirm('Delete?')) return;
        await fetch(`/api/admin/flag-companies?id=${id}`, { method: 'DELETE', headers: auth() });
        load();
    };
    return (
        <div>
            <div style={cardS}>
                <h3 style={{ color: '#f1f5f9', marginTop: 0 }}>Add new</h3>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '120px 1fr 1fr 1fr 1fr 80px 80px auto' }}>
                    <select style={inputS} value={draft.country_code} onChange={e => setDraft({ ...draft, country_code: e.target.value })}>
                        {FLAG_CODES.map(f => <option key={f.code} value={f.code}>{f.code.toUpperCase()} — {f.label}</option>)}
                    </select>
                    <input style={inputS} placeholder="Company name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
                    <input style={inputS} placeholder="Description" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} />
                    <input style={inputS} placeholder="Logo URL" value={draft.logo_url} onChange={e => setDraft({ ...draft, logo_url: e.target.value })} />
                    <input style={inputS} placeholder="Website" value={draft.website} onChange={e => setDraft({ ...draft, website: e.target.value })} />
                    <label style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={draft.is_featured} onChange={e => setDraft({ ...draft, is_featured: e.target.checked })} /> Feat
                    </label>
                    <input style={inputS} type="number" value={draft.sort_order} onChange={e => setDraft({ ...draft, sort_order: parseInt(e.target.value) || 0 })} />
                    <button onClick={create} disabled={busy} className="ai-btn ai-btn-primary" style={{ height: 36, opacity: busy ? 0.5 : 1 }}>
                        <div className="ai-btn-inner" style={{ background: '#10b981', color: 'white' }}>{busy ? '...' : 'Add'}</div>
                    </button>
                </div>
                {feedback && (
                    <div style={{
                        marginTop: 10,
                        padding: '8px 12px',
                        borderRadius: 6,
                        fontSize: '0.85rem',
                        background: feedback.type === 'ok' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: feedback.type === 'ok' ? '#10b981' : '#ef4444',
                        border: `1px solid ${feedback.type === 'ok' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                    }}>
                        {feedback.type === 'ok' ? '✓ ' : '⚠ '}{feedback.text}
                    </div>
                )}
                <div style={{ marginTop: 10, fontSize: '0.8rem', color: '#94a3b8' }}>
                    Toplam kayıt: <b style={{ color: '#f1f5f9' }}>{rows.length}</b>
                </div>
            </div>
            {rows.map(r => (
                <div key={r.id} style={{ ...cardS, display: 'grid', gap: 8, gridTemplateColumns: '120px 1fr 1fr 1fr 1fr 80px 80px auto auto' }}>
                    <select style={inputS} value={r.country_code} onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, country_code: e.target.value } : x))}>
                        {FLAG_CODES.map(f => <option key={f.code} value={f.code}>{f.code.toUpperCase()} — {f.label}</option>)}
                    </select>
                    <input style={inputS} value={r.name} onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, name: e.target.value } : x))} />
                    <input style={inputS} value={r.description || ''} onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, description: e.target.value } : x))} />
                    <input style={inputS} value={r.logo_url || ''} onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, logo_url: e.target.value } : x))} />
                    <input style={inputS} value={r.website || ''} onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, website: e.target.value } : x))} />
                    <label style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={!!r.is_featured} onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, is_featured: e.target.checked } : x))} /> Feat
                    </label>
                    <input style={inputS} type="number" value={r.sort_order || 0} onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, sort_order: parseInt(e.target.value) || 0 } : x))} />
                    <button onClick={() => update(r)} className="ai-btn" style={{ height: 36 }}><div className="ai-btn-inner">Save</div></button>
                    <button onClick={() => remove(r.id)} className="ai-btn ai-btn-danger" style={{ height: 36 }}><div className="ai-btn-inner">×</div></button>
                </div>
            ))}
        </div>
    );
};

const Banners = () => {
    const [rows, setRows] = useState({ left: '', right: '', top: '' });
    const load = async () => {
        const r = await fetch('/api/admin/banners', { headers: auth() });
        const j = await r.json();
        const next = { left: '', right: '', top: '' };
        for (const x of (j.items || [])) next[x.slot] = x.image_url;
        setRows(next);
    };
    useEffect(() => { load(); }, []);
    const save = async (slot) => {
        await fetch('/api/admin/banners', { method: 'PUT', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify({ slot, image_url: rows[slot] }) });
        load();
    };
    return (
        <div>
            {['left', 'top', 'right'].map(slot => (
                <div key={slot} style={cardS}>
                    <h3 style={{ color: '#f1f5f9', margin: '0 0 8px', textTransform: 'capitalize' }}>{slot} banner</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input style={inputS} placeholder="https://...image.jpg or /banners/x.jpg" value={rows[slot]} onChange={e => setRows({ ...rows, [slot]: e.target.value })} />
                        <button onClick={() => save(slot)} className="ai-btn" style={{ height: 36 }}><div className="ai-btn-inner">Save</div></button>
                    </div>
                    {rows[slot] && <img src={rows[slot]} alt="" style={{ marginTop: 8, maxHeight: 90, borderRadius: 6 }} />}
                </div>
            ))}
        </div>
    );
};

const MessageList = ({ type, columns, allowMarkRead = true }) => {
    const [rows, setRows] = useState([]);
    const load = async () => {
        const r = await fetch(`/api/admin/messages?type=${type}`, { headers: auth() });
        const j = await r.json();
        setRows(j.items || []);
    };
    useEffect(() => { load(); }, [type]);
    const mark = async (id, is_read) => {
        await fetch('/api/admin/messages', { method: 'PATCH', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify({ type, id, is_read }) });
        load();
    };
    return (
        <div>
            {rows.length === 0 && <div style={{ color: '#64748b' }}>No records.</div>}
            {rows.map(r => (
                <div key={r.id} style={{ ...cardS, opacity: r.is_read ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <strong style={{ color: '#f1f5f9' }}>{columns.title(r)}</strong>
                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{columns.body(r)}</div>
                    {allowMarkRead && (
                        <div style={{ marginTop: 8 }}>
                            <button onClick={() => mark(r.id, !r.is_read)} className="ai-btn" style={{ height: 30 }}>
                                <div className="ai-btn-inner" style={{ fontSize: '0.8rem' }}>{r.is_read ? 'Mark unread' : 'Mark read'}</div>
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

const Admin = () => {
    const [user, setUser] = useState(null);
    const [tab, setTab] = useState('flags');

    useEffect(() => {
        const tok = localStorage.getItem(TOKEN_KEY);
        if (tok) {
            // Optimistic — verify by hitting any admin endpoint.
            fetch('/api/admin/banners', { headers: auth() }).then(r => {
                if (r.ok) setUser({ email: 'admin' });
                else localStorage.removeItem(TOKEN_KEY);
            });
        }
    }, []);

    if (!user) return <div style={{ minHeight: '100vh', background: '#0b1220' }}><Login onAuthed={setUser} /></div>;

    return (
        <div style={{ minHeight: '100vh', background: '#0b1220', color: '#e2e8f0', padding: 24 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h1 style={{ margin: 0, color: '#f8fafc' }}>LDM Admin</h1>
                <button onClick={() => { localStorage.removeItem(TOKEN_KEY); setUser(null); }} className="ai-btn" style={{ height: 36 }}>
                    <div className="ai-btn-inner">Logout</div>
                </button>
            </header>
            <nav style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {[
                    ['flags',     'Flag companies'],
                    ['banners',   'Banners'],
                    ['contact',   'Contact'],
                    ['advertise', 'Advertise'],
                    ['screenshot','Screenshot logs']
                ].map(([k, l]) => (
                    <button key={k} onClick={() => setTab(k)} className="ai-btn" style={{ height: 34 }}>
                        <div className="ai-btn-inner" style={{ background: tab === k ? '#3b82f6' : 'transparent', color: 'white' }}>{l}</div>
                    </button>
                ))}
            </nav>
            <main>
                {tab === 'flags'   && <FlagCompanies />}
                {tab === 'banners' && <Banners />}
                {tab === 'contact' && <MessageList type="contact" columns={{
                    title: r => `${r.name} <${r.email}>${r.subject ? ' — ' + r.subject : ''}`,
                    body: r => r.message
                }} />}
                {tab === 'advertise' && <MessageList type="advertise" columns={{
                    title: r => `${r.company_name} — ${r.contact_name} <${r.email}>${r.budget ? ' (' + r.budget + ')' : ''}`,
                    body: r => `${r.phone ? 'Phone: ' + r.phone + '\n' : ''}${r.message || ''}`
                }} />}
                {tab === 'screenshot' && <MessageList type="screenshot" allowMarkRead={false} columns={{
                    title: r => `${r.company_name || '(no company)'}${r.plate ? ' • ' + r.plate : ''}${r.driver ? ' • ' + r.driver : ''}`,
                    body: r => `${r.truck_type ? 'Truck: ' + r.truck_type + '\n' : ''}${r.note || ''}`
                }} />}
            </main>
        </div>
    );
};

export default Admin;
