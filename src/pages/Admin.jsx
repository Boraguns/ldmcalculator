import { useEffect, useState, useMemo } from 'react';
// Bundled JSON dictionaries — used as the "default" column in the site
// content editor so admins can see what they're overriding.
import enDict from '../i18n/locales/en.json';
import trDict from '../i18n/locales/tr.json';
import deDict from '../i18n/locales/de.json';
import ruDict from '../i18n/locales/ru.json';
import frDict from '../i18n/locales/fr.json';
import arDict from '../i18n/locales/ar.json';
const DICTS = { en: enDict, tr: trDict, de: deDict, ru: ruDict, fr: frDict, ar: arDict };

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
    const [draft, setDraft] = useState({ country_code: 'tr', name: '', description: '', logo_url: '', website: '', phone: '', email: '', is_featured: false, sort_order: 0 });
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
            setDraft({ country_code: 'tr', name: '', description: '', logo_url: '', website: '', phone: '', email: '', is_featured: false, sort_order: 0 });
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
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '120px 1fr 1fr 1fr 1fr 1fr 1fr 80px 80px auto' }}>
                    <select style={inputS} value={draft.country_code} onChange={e => setDraft({ ...draft, country_code: e.target.value })}>
                        {FLAG_CODES.map(f => <option key={f.code} value={f.code}>{f.code.toUpperCase()} — {f.label}</option>)}
                    </select>
                    <input style={inputS} placeholder="Company name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
                    <input style={inputS} placeholder="Description" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} />
                    <input style={inputS} placeholder="Logo URL" value={draft.logo_url} onChange={e => setDraft({ ...draft, logo_url: e.target.value })} />
                    <input style={inputS} placeholder="Website" value={draft.website} onChange={e => setDraft({ ...draft, website: e.target.value })} />
                    <input style={inputS} placeholder="Phone" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} />
                    <input style={inputS} placeholder="Email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} />
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
                <div key={r.id} style={{ ...cardS, display: 'grid', gap: 8, gridTemplateColumns: '120px 1fr 1fr 1fr 1fr 1fr 1fr 80px 80px auto auto' }}>
                    <select style={inputS} value={r.country_code} onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, country_code: e.target.value } : x))}>
                        {FLAG_CODES.map(f => <option key={f.code} value={f.code}>{f.code.toUpperCase()} — {f.label}</option>)}
                    </select>
                    <input style={inputS} value={r.name} onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, name: e.target.value } : x))} />
                    <input style={inputS} value={r.description || ''} onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, description: e.target.value } : x))} />
                    <input style={inputS} value={r.logo_url || ''} onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, logo_url: e.target.value } : x))} />
                    <input style={inputS} value={r.website || ''} onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, website: e.target.value } : x))} />
                    <input style={inputS} value={r.phone || ''} onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, phone: e.target.value } : x))} />
                    <input style={inputS} value={r.email || ''} onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, email: e.target.value } : x))} />
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

// Recommended banner pixel sizes — must roughly match the 3D plane aspect.
//   side banners: scene plane is 2.0 × 8.5 → ~1:4.25 portrait
//   top banner:   scene plane is 24 × 1.8 → ~13.3:1 landscape
const BANNER_SPECS = {
    left:  { w: 512,  h: 2176, label: 'Sol Branda',   aspect: '1:4.25 (portrait)' },
    top:   { w: 1920, h: 144,  label: 'Üst Branda',   aspect: '13.3:1 (landscape)' },
    right: { w: 512,  h: 2176, label: 'Sağ Branda',   aspect: '1:4.25 (portrait)' }
};

// Resize an image File to fit within target dimensions while preserving its
// aspect ratio, then return a JPEG/PNG data URL. Avoids huge base64 blobs.
const resizeImage = (file, targetW, targetH) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Image decode failed'));
        img.onload = () => {
            // Cover-fit: scale so that the smaller axis matches, then crop to
            // exact target dimensions (centered).
            const sRatio = img.width / img.height;
            const tRatio = targetW / targetH;
            let sx, sy, sw, sh;
            if (sRatio > tRatio) { // source wider → crop sides
                sh = img.height;
                sw = sh * tRatio;
                sx = (img.width - sw) / 2;
                sy = 0;
            } else { // source taller → crop top/bottom
                sw = img.width;
                sh = sw / tRatio;
                sx = 0;
                sy = (img.height - sh) / 2;
            }
            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
            // PNG keeps colors crisp for printed banners; jpeg saves bytes.
            // Use jpeg at 0.9 for sane file sizes.
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
});

const Banners = () => {
    const [rows, setRows] = useState({ left: '', right: '', top: '' });
    const [busy, setBusy] = useState({});
    const [feedback, setFeedback] = useState({});
    const load = async () => {
        const r = await fetch('/api/admin/banners', { headers: auth() });
        const j = await r.json();
        const next = { left: '', right: '', top: '' };
        for (const x of (j.items || [])) next[x.slot] = x.image_url;
        setRows(next);
    };
    useEffect(() => { load(); }, []);

    const upload = async (slot, file) => {
        if (!file) return;
        setBusy(b => ({ ...b, [slot]: true }));
        setFeedback(f => ({ ...f, [slot]: null }));
        try {
            const spec = BANNER_SPECS[slot];
            const dataUrl = await resizeImage(file, spec.w, spec.h);
            // Quick size guard: anything > 4MB after compression is suspicious.
            const sizeKB = Math.round((dataUrl.length * 3 / 4) / 1024);
            if (sizeKB > 4096) throw new Error(`Image too large after compression (${sizeKB} KB)`);
            const r = await fetch('/api/admin/banners', {
                method: 'PUT',
                headers: { ...auth(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ slot, image_url: dataUrl })
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
            setFeedback(f => ({ ...f, [slot]: { type: 'ok', text: `Yüklendi (${sizeKB} KB)` } }));
            await load();
            setTimeout(() => setFeedback(f => ({ ...f, [slot]: null })), 3000);
        } catch (e) {
            setFeedback(f => ({ ...f, [slot]: { type: 'err', text: e.message || 'Upload failed' } }));
        } finally {
            setBusy(b => ({ ...b, [slot]: false }));
        }
    };

    return (
        <div>
            {['left', 'top', 'right'].map(slot => {
                const spec = BANNER_SPECS[slot];
                const fb = feedback[slot];
                return (
                    <div key={slot} style={cardS}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                            <h3 style={{ color: '#f1f5f9', margin: 0 }}>{spec.label}</h3>
                            <span style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 600 }}>
                                Önerilen: {spec.w} × {spec.h} px ({spec.aspect})
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <label
                                className="ai-btn"
                                style={{ height: 40, padding: 2, cursor: busy[slot] ? 'wait' : 'pointer', opacity: busy[slot] ? 0.5 : 1 }}
                            >
                                <div className="ai-btn-inner" style={{ padding: '0 16px', height: '100%', fontSize: '0.85rem' }}>
                                    {busy[slot] ? 'Yükleniyor…' : '📤 Görsel Yükle'}
                                </div>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    style={{ display: 'none' }}
                                    disabled={busy[slot]}
                                    onChange={(e) => {
                                        const f = e.target.files && e.target.files[0];
                                        e.target.value = '';
                                        if (f) upload(slot, f);
                                    }}
                                />
                            </label>
                            {rows[slot] && (
                                <button
                                    onClick={async () => {
                                        if (!confirm('Bu brandayı kaldırmak istediğinize emin misiniz?')) return;
                                        await fetch('/api/admin/banners', { method: 'PUT', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify({ slot, image_url: '' }) });
                                        load();
                                    }}
                                    className="ai-btn ai-btn-danger"
                                    style={{ height: 40 }}
                                >
                                    <div className="ai-btn-inner">Kaldır</div>
                                </button>
                            )}
                            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                Görsel otomatik olarak {spec.w}×{spec.h} px boyutuna ölçeklenir (kenar kırpılır).
                            </span>
                        </div>
                        {fb && (
                            <div style={{
                                marginTop: 10, padding: '6px 10px', borderRadius: 6,
                                fontSize: '0.85rem',
                                background: fb.type === 'ok' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: fb.type === 'ok' ? '#10b981' : '#ef4444',
                                border: `1px solid ${fb.type === 'ok' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                            }}>
                                {fb.type === 'ok' ? '✓ ' : '⚠ '}{fb.text}
                            </div>
                        )}
                        {rows[slot] && (
                            <img
                                src={rows[slot]}
                                alt={slot}
                                style={{
                                    marginTop: 10, maxHeight: 120, maxWidth: '100%',
                                    borderRadius: 6, background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)'
                                }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// Flatten a nested object into dot-notation key/value pairs. Skips arrays
// (the FAQ list etc.) — we only want plain string overrides for now.
const flattenDict = (obj, prefix = '', acc = []) => {
    for (const k of Object.keys(obj)) {
        const v = obj[k];
        const path = prefix ? `${prefix}.${k}` : k;
        if (typeof v === 'string') acc.push([path, v]);
        else if (v && typeof v === 'object' && !Array.isArray(v)) flattenDict(v, path, acc);
    }
    return acc;
};

const SiteContent = () => {
    const [lang, setLang] = useState('tr');
    const [overrides, setOverrides] = useState({});
    const [filter, setFilter] = useState('');
    const [drafts, setDrafts] = useState({}); // unsaved per-key edits
    const [busy, setBusy] = useState({});
    const [savedAt, setSavedAt] = useState({}); // ts per key for "✓ Saved" flash

    const flatDefaults = useMemo(() => flattenDict(DICTS[lang] || {}), [lang]);

    const load = async (l) => {
        const r = await fetch(`/api/admin/translations?lang=${l}`, { headers: auth() });
        if (!r.ok) { setOverrides({}); return; }
        const j = await r.json();
        setOverrides(j.overrides || {});
        setDrafts({});
    };
    useEffect(() => { load(lang); }, [lang]);

    const save = async (key) => {
        const value = drafts[key] ?? overrides[key] ?? '';
        setBusy(b => ({ ...b, [key]: true }));
        try {
            const r = await fetch('/api/admin/translations', {
                method: 'PUT',
                headers: { ...auth(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ lang, key, value })
            });
            if (!r.ok) throw new Error('save failed');
            const next = { ...overrides };
            if (value === '') delete next[key]; else next[key] = value;
            setOverrides(next);
            setDrafts(d => { const c = { ...d }; delete c[key]; return c; });
            setSavedAt(s => ({ ...s, [key]: Date.now() }));
        } catch (e) {
            alert(e.message);
        } finally {
            setBusy(b => ({ ...b, [key]: false }));
        }
    };

    const visible = flatDefaults.filter(([k, v]) =>
        !filter ||
        k.toLowerCase().includes(filter.toLowerCase()) ||
        v.toLowerCase().includes(filter.toLowerCase()) ||
        (overrides[k] || '').toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div>
            <div style={{ ...cardS, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong style={{ color: '#f1f5f9' }}>Dil:</strong>
                {['tr', 'en', 'de', 'ru', 'fr', 'ar'].map(l => (
                    <button key={l} onClick={() => setLang(l)} className="ai-btn" style={{ height: 32 }}>
                        <div className="ai-btn-inner" style={{
                            padding: '0 14px',
                            background: lang === l ? '#3b82f6' : 'transparent',
                            color: 'white',
                            fontSize: '0.85rem',
                            textTransform: 'uppercase'
                        }}>{l}</div>
                    </button>
                ))}
                <input
                    style={{ ...inputS, flex: 1, minWidth: 220 }}
                    placeholder="Filtrele (anahtar veya metin)…"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                />
                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                    {visible.length} / {flatDefaults.length} anahtar
                </span>
            </div>
            <div style={{ ...cardS, padding: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 1fr 130px', gap: 0, padding: '10px 14px', background: 'rgba(15,23,42,0.6)', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>Anahtar</div>
                    <div>Default ({lang.toUpperCase()})</div>
                    <div>Override</div>
                    <div></div>
                </div>
                {visible.map(([k, defVal]) => {
                    const draft = drafts[k];
                    const ov = overrides[k] || '';
                    const current = draft !== undefined ? draft : ov;
                    const isOverridden = ov !== '' && ov !== defVal;
                    const justSaved = savedAt[k] && Date.now() - savedAt[k] < 2500;
                    return (
                        <div key={k} style={{ display: 'grid', gridTemplateColumns: '260px 1fr 1fr 130px', gap: 8, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'start' }}>
                            <div style={{ color: isOverridden ? '#fbbf24' : '#cbd5e1', fontSize: '0.78rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                {isOverridden && '● '}{k}
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{defVal}</div>
                            <textarea
                                style={{ ...inputS, fontSize: '0.85rem', resize: 'vertical', minHeight: 36 }}
                                value={current}
                                placeholder={defVal}
                                onChange={e => setDrafts(d => ({ ...d, [k]: e.target.value }))}
                            />
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                    onClick={() => save(k)}
                                    disabled={busy[k] || (draft === undefined && !ov && !current)}
                                    className="ai-btn"
                                    style={{ height: 30, opacity: busy[k] ? 0.5 : 1 }}
                                >
                                    <div className="ai-btn-inner" style={{ background: justSaved ? '#10b981' : '#3b82f6', color: 'white', padding: '0 10px', fontSize: '0.78rem' }}>
                                        {busy[k] ? '...' : justSaved ? '✓' : 'Kaydet'}
                                    </div>
                                </button>
                                {ov && (
                                    <button
                                        onClick={async () => { setDrafts(d => ({ ...d, [k]: '' })); save(k); }}
                                        className="ai-btn ai-btn-danger"
                                        style={{ height: 30 }}
                                    >
                                        <div className="ai-btn-inner" style={{ padding: '0 10px', fontSize: '0.78rem' }}>×</div>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Catalog of replaceable site images. Each entry pairs an asset_key (used by
// the front-end useSiteAsset hook) with a label, a recommended pixel size,
// and the bundled fallback path. Adding a new entry here surfaces a new
// upload card in the admin tab.
const SITE_ASSETS = [
    { key: 'home_logo',         label: 'Anasayfa Logo',         w: 640,  h: 200, fallback: '/src/ldm-calculator-logo.png' },
    { key: 'viewer_logo',       label: 'Viewer Logo (beyaz)',   w: 640,  h: 200, fallback: '/src/ldm-calculator-beyaz-logo.png' },
    { key: 'home_bg',           label: 'Anasayfa Arka Plan',    w: 1920, h: 1080, fallback: '/src/bg.jpg' },
    { key: 'home_bg_mobile',    label: 'Mobil Arka Plan',        w: 768,  h: 1366, fallback: '/src/mobil-bg.jpg' },
    { key: 'home_bg_truck',     label: 'Hover BG: Truck',        w: 1920, h: 1080, fallback: '/src/bg1.jpg' },
    { key: 'home_bg_train',     label: 'Hover BG: Train',        w: 1920, h: 1080, fallback: '/src/bg2.jpg' },
    { key: 'home_bg_plane',     label: 'Hover BG: Plane',        w: 1920, h: 1080, fallback: '/src/bg3.jpg' },
    { key: 'home_bg_ship',      label: 'Hover BG: Ship',         w: 1920, h: 1080, fallback: '/src/bg4.jpg' },
    { key: 'home_thumb_truck',  label: 'Thumb: Truck',           w: 256,  h: 256, fallback: '/src/tir.png' },
    { key: 'home_thumb_train',  label: 'Thumb: Train',           w: 256,  h: 256, fallback: '/src/tren.png' },
    { key: 'home_thumb_plane',  label: 'Thumb: Plane',           w: 256,  h: 256, fallback: '/src/ucak.png' },
    { key: 'home_thumb_ship',   label: 'Thumb: Ship',            w: 256,  h: 256, fallback: '/src/gemi.png' }
];

const SiteAssets = () => {
    const [rows, setRows] = useState({});
    const [busy, setBusy] = useState({});
    const [feedback, setFeedback] = useState({});
    const load = async () => {
        const r = await fetch('/api/admin/site-assets', { headers: auth() });
        if (!r.ok) return;
        const j = await r.json();
        const next = {};
        for (const x of (j.items || [])) next[x.asset_key] = x.image_url;
        setRows(next);
    };
    useEffect(() => { load(); }, []);

    const upload = async (asset, file) => {
        if (!file) return;
        setBusy(b => ({ ...b, [asset.key]: true }));
        setFeedback(f => ({ ...f, [asset.key]: null }));
        try {
            const dataUrl = await resizeImage(file, asset.w, asset.h);
            const sizeKB = Math.round((dataUrl.length * 3 / 4) / 1024);
            if (sizeKB > 4096) throw new Error(`Too large: ${sizeKB} KB`);
            const r = await fetch('/api/admin/site-assets', {
                method: 'PUT',
                headers: { ...auth(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ asset_key: asset.key, image_url: dataUrl })
            });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            setFeedback(f => ({ ...f, [asset.key]: { type: 'ok', text: `Yüklendi (${sizeKB} KB)` } }));
            await load();
            setTimeout(() => setFeedback(f => ({ ...f, [asset.key]: null })), 3000);
        } catch (e) {
            setFeedback(f => ({ ...f, [asset.key]: { type: 'err', text: e.message } }));
        } finally {
            setBusy(b => ({ ...b, [asset.key]: false }));
        }
    };

    const clear = async (key) => {
        if (!confirm('Bu görseli kaldırıp default\'a döndür?')) return;
        await fetch('/api/admin/site-assets', { method: 'PUT', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify({ asset_key: key, image_url: '' }) });
        load();
    };

    return (
        <div>
            {SITE_ASSETS.map(asset => {
                const current = rows[asset.key];
                const fb = feedback[asset.key];
                return (
                    <div key={asset.key} style={cardS}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                            <h3 style={{ color: '#f1f5f9', margin: 0 }}>{asset.label}</h3>
                            <span style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 600 }}>
                                Önerilen: {asset.w} × {asset.h} px
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <label className="ai-btn" style={{ height: 36, padding: 2, cursor: busy[asset.key] ? 'wait' : 'pointer', opacity: busy[asset.key] ? 0.5 : 1 }}>
                                <div className="ai-btn-inner" style={{ padding: '0 14px', height: '100%', fontSize: '0.85rem' }}>
                                    {busy[asset.key] ? 'Yükleniyor…' : '📤 Görsel Yükle'}
                                </div>
                                <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} disabled={busy[asset.key]}
                                    onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) upload(asset, f); }}
                                />
                            </label>
                            {current && (
                                <button onClick={() => clear(asset.key)} className="ai-btn ai-btn-danger" style={{ height: 36 }}>
                                    <div className="ai-btn-inner">Default\'a Döndür</div>
                                </button>
                            )}
                            <span style={{ color: '#64748b', fontSize: '0.78rem' }}>
                                {current ? '✓ Override aktif' : `Default: ${asset.fallback}`}
                            </span>
                        </div>
                        {fb && (
                            <div style={{
                                marginTop: 8, padding: '6px 10px', borderRadius: 6, fontSize: '0.85rem',
                                background: fb.type === 'ok' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: fb.type === 'ok' ? '#10b981' : '#ef4444',
                                border: `1px solid ${fb.type === 'ok' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                            }}>{fb.type === 'ok' ? '✓ ' : '⚠ '}{fb.text}</div>
                        )}
                        {(current || asset.fallback) && (
                            <img src={current || asset.fallback} alt={asset.key}
                                style={{ marginTop: 10, maxHeight: 90, maxWidth: '100%', borderRadius: 6, background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const ProductNameLogs = () => {
    const [rows, setRows] = useState([]);
    const [filter, setFilter] = useState('');
    const [expanded, setExpanded] = useState({});
    const load = async () => {
        const r = await fetch('/api/admin/product-names', { headers: auth() });
        if (!r.ok) return;
        const j = await r.json();
        setRows(j.items || []);
    };
    useEffect(() => { load(); }, []);

    // Group events by session_id while preserving recency order.
    const grouped = useMemo(() => {
        const map = new Map();
        for (const r of rows) {
            const key = r.session_id;
            if (!map.has(key)) map.set(key, { session_id: key, events: [], firstAt: r.created_at, lastAt: r.created_at, allNames: new Set(), userAgent: r.user_agent });
            const g = map.get(key);
            g.events.push(r);
            if (r.created_at < g.firstAt) g.firstAt = r.created_at;
            if (r.created_at > g.lastAt) g.lastAt = r.created_at;
            for (const n of (r.names || [])) g.allNames.add(n);
        }
        return Array.from(map.values()).sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
    }, [rows]);

    const filtered = grouped.filter(g => {
        if (!filter) return true;
        const f = filter.toLowerCase();
        if (g.session_id.toLowerCase().includes(f)) return true;
        for (const n of g.allNames) if (n.toLowerCase().includes(f)) return true;
        return false;
    });

    return (
        <div>
            <div style={{ ...cardS, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                    style={{ ...inputS, flex: 1, minWidth: 220 }}
                    placeholder="Filtrele (oturum id veya ürün ismi)…"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                />
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    {filtered.length} oturum, toplam {rows.length} hesaplama
                </span>
                <button onClick={load} className="ai-btn" style={{ height: 32 }}>
                    <div className="ai-btn-inner" style={{ padding: '0 14px', fontSize: '0.8rem' }}>↻ Yenile</div>
                </button>
            </div>
            {filtered.length === 0 && (
                <div style={{ ...cardS, color: '#64748b', textAlign: 'center' }}>Henüz kayıt yok.</div>
            )}
            {filtered.map(g => {
                const isOpen = !!expanded[g.session_id];
                return (
                    <div key={g.session_id} style={cardS}>
                        <div
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: 12 }}
                            onClick={() => setExpanded(s => ({ ...s, [g.session_id]: !isOpen }))}
                        >
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ color: '#f1f5f9', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {isOpen ? '▼' : '▶'} {g.session_id}
                                </div>
                                <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 4 }}>
                                    {g.events.length} hesaplama • {g.allNames.size} farklı isim • son: {new Date(g.lastAt).toLocaleString()}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '60%' }}>
                                {Array.from(g.allNames).slice(0, 8).map(n => (
                                    <span key={n} style={{ background: 'rgba(59, 130, 246, 0.18)', color: '#93c5fd', padding: '3px 8px', borderRadius: 6, fontSize: '0.78rem' }}>{n}</span>
                                ))}
                                {g.allNames.size > 8 && <span style={{ color: '#64748b', fontSize: '0.78rem' }}>+{g.allNames.size - 8}</span>}
                            </div>
                        </div>
                        {isOpen && (
                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                {g.events.map(ev => (
                                    <div key={ev.id} style={{ marginBottom: 8, fontSize: '0.85rem' }}>
                                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{new Date(ev.created_at).toLocaleString()}</div>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                            {(ev.names || []).map((n, i) => (
                                                <span key={i} style={{ background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', padding: '3px 8px', borderRadius: 6 }}>{n}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {g.userAgent && (
                                    <div style={{ color: '#475569', fontSize: '0.7rem', marginTop: 8, fontFamily: 'monospace' }}>
                                        UA: {g.userAgent}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
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
                    ['assets',    'Site Görselleri'],
                    ['site',      'Site Yönetimi'],
                    ['names',     'Ürün İsim Logları'],
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
                {tab === 'assets'  && <SiteAssets />}
                {tab === 'site'    && <SiteContent />}
                {tab === 'names'   && <ProductNameLogs />}
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
