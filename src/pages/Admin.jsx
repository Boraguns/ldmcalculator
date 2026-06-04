import { useEffect, useState, useMemo, useRef } from 'react';
import { PROMO_FREE } from '../utils/promo';
import { linkify } from '../utils/linkify';
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

// Contain-fit resizer for logos: scales down within a max box while preserving
// aspect ratio (no crop) and keeps transparency by exporting PNG.
const resizeImageContain = (file, maxW, maxH) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Image decode failed'));
        img.onload = () => {
            const scale = Math.min(1, maxW / img.width, maxH / img.height);
            const w = Math.max(1, Math.round(img.width * scale));
            const h = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
});

// Reference companies (public "Referanslar" gallery) — name + logo CRUD.
const ReferencesManager = () => {
    const [rows, setRows] = useState([]);
    const [draft, setDraft] = useState({ name: '', logo_url: '', website: '', sort_order: 0, is_active: true });
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState({});
    const [feedback, setFeedback] = useState(null);

    const load = async () => {
        const r = await fetch('/api/admin/references', { headers: auth() });
        if (!r.ok) { setRows([]); return; }
        const j = await r.json();
        setRows(j.items || []);
    };
    useEffect(() => { load(); }, []);

    const pickLogo = (file, onDone) => {
        if (!file) return;
        resizeImageContain(file, 600, 400)
            .then(onDone)
            .catch(e => setFeedback({ type: 'err', text: e.message || 'Logo yüklenemedi' }));
    };

    const create = async () => {
        if (!draft.name.trim()) { setFeedback({ type: 'err', text: 'Firma adı zorunlu' }); return; }
        setBusy(true); setFeedback(null);
        try {
            const r = await fetch('/api/admin/references', {
                method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...draft, sort_order: parseInt(draft.sort_order) || 0 }),
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) { setFeedback({ type: 'err', text: j.error || `HTTP ${r.status}` }); return; }
            setDraft({ name: '', logo_url: '', website: '', sort_order: 0, is_active: true });
            await load();
            setFeedback({ type: 'ok', text: `Eklendi: ${j.item?.name}` });
            setTimeout(() => setFeedback(null), 3000);
        } catch (e) {
            setFeedback({ type: 'err', text: e.message || 'Network error' });
        } finally { setBusy(false); }
    };

    const update = async (item) => {
        await fetch('/api/admin/references', {
            method: 'PATCH', headers: { ...auth(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, sort_order: parseInt(item.sort_order) || 0 }),
        });
        load();
    };
    const remove = async (id) => {
        if (!confirm('Bu referansı silmek istediğinize emin misiniz?')) return;
        await fetch(`/api/admin/references?id=${id}`, { method: 'DELETE', headers: auth() });
        load();
    };

    const logoBox = { width: 90, height: 56, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden', flex: '0 0 auto' };

    return (
        <div>
            <div style={cardS}>
                <h3 style={{ color: '#f1f5f9', marginTop: 0 }}>Yeni Referans Ekle</h3>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={logoBox}>
                        {draft.logo_url
                            ? <img src={draft.logo_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            : <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>logo</span>}
                    </div>
                    <label className="ai-btn" style={{ height: 36, padding: 2, cursor: 'pointer' }}>
                        <div className="ai-btn-inner" style={{ padding: '0 12px', height: '100%', fontSize: '0.82rem' }}>📤 Logo</div>
                        <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display: 'none' }}
                            onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; pickLogo(f, (url) => setDraft(d => ({ ...d, logo_url: url }))); }} />
                    </label>
                    <input style={{ ...inputS, flex: '1 1 180px' }} placeholder="Firma adı" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
                    <input style={{ ...inputS, flex: '1 1 180px' }} placeholder="Website (opsiyonel)" value={draft.website} onChange={e => setDraft({ ...draft, website: e.target.value })} />
                    <input style={{ ...inputS, width: 80 }} type="number" placeholder="Sıra" value={draft.sort_order} onChange={e => setDraft({ ...draft, sort_order: e.target.value })} />
                    <label style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={draft.is_active} onChange={e => setDraft({ ...draft, is_active: e.target.checked })} /> Aktif
                    </label>
                    <button onClick={create} disabled={busy} className="ai-btn ai-btn-primary" style={{ height: 36, opacity: busy ? 0.5 : 1 }}>
                        <div className="ai-btn-inner" style={{ background: '#10b981', color: 'white' }}>{busy ? '...' : '+ Ekle'}</div>
                    </button>
                </div>
                {feedback && (
                    <div style={{
                        marginTop: 10, padding: '8px 12px', borderRadius: 6, fontSize: '0.85rem',
                        background: feedback.type === 'ok' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: feedback.type === 'ok' ? '#10b981' : '#ef4444',
                        border: `1px solid ${feedback.type === 'ok' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                    }}>{feedback.type === 'ok' ? '✓ ' : '⚠ '}{feedback.text}</div>
                )}
                <div style={{ marginTop: 10, fontSize: '0.8rem', color: '#94a3b8' }}>
                    Toplam referans: <b style={{ color: '#f1f5f9' }}>{rows.length}</b>
                </div>
            </div>

            {rows.map(r => (
                <div key={r.id} style={{ ...cardS, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={logoBox}>
                        {r.logo_url
                            ? <img src={r.logo_url} alt={r.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            : <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>logo</span>}
                    </div>
                    <label className="ai-btn" style={{ height: 34, padding: 2, cursor: 'pointer' }}>
                        <div className="ai-btn-inner" style={{ padding: '0 10px', height: '100%', fontSize: '0.78rem' }}>
                            {uploading[r.id] ? '...' : '📤'}
                        </div>
                        <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display: 'none' }}
                            onChange={(e) => {
                                const f = e.target.files && e.target.files[0]; e.target.value = '';
                                setUploading(u => ({ ...u, [r.id]: true }));
                                pickLogo(f, async (url) => {
                                    await update({ ...r, logo_url: url });
                                    setUploading(u => ({ ...u, [r.id]: false }));
                                });
                            }} />
                    </label>
                    <input style={{ ...inputS, flex: '1 1 180px' }} value={r.name} onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, name: e.target.value } : x))} />
                    <input style={{ ...inputS, flex: '1 1 180px' }} placeholder="Website" value={r.website || ''} onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, website: e.target.value } : x))} />
                    <input style={{ ...inputS, width: 80 }} type="number" value={r.sort_order || 0} onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, sort_order: e.target.value } : x))} />
                    <label style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={!!r.is_active} onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, is_active: e.target.checked } : x))} /> Aktif
                    </label>
                    <button onClick={() => update(r)} className="ai-btn" style={{ height: 34 }}><div className="ai-btn-inner">Kaydet</div></button>
                    <button onClick={() => remove(r.id)} className="ai-btn ai-btn-danger" style={{ height: 34 }}><div className="ai-btn-inner">×</div></button>
                </div>
            ))}
        </div>
    );
};

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

const FAQManager = () => {
    const [lang, setLang] = useState('tr');
    const [items, setItems] = useState([]);
    const [draft, setDraft] = useState({ question: '', answer: '', sort_order: 0 });
    const [busy, setBusy] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const load = async (l) => {
        const r = await fetch(`/api/admin/faq?lang=${l}`, { headers: auth() });
        if (!r.ok) { setItems([]); return; }
        const j = await r.json();
        setItems(j.items || []);
    };
    useEffect(() => { load(lang); }, [lang]);

    const create = async () => {
        if (!draft.question.trim() || !draft.answer.trim()) {
            setFeedback({ type: 'err', text: 'Soru ve cevap zorunlu' });
            return;
        }
        setBusy(true);
        try {
            const r = await fetch('/api/admin/faq', {
                method: 'POST',
                headers: { ...auth(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lang,
                    question: draft.question.trim(),
                    answer: draft.answer.trim(),
                    sort_order: parseInt(draft.sort_order) || items.length
                })
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
            setDraft({ question: '', answer: '', sort_order: 0 });
            await load(lang);
            setFeedback({ type: 'ok', text: 'Eklendi' });
            setTimeout(() => setFeedback(null), 2500);
        } catch (e) {
            setFeedback({ type: 'err', text: e.message });
        } finally {
            setBusy(false);
        }
    };

    const update = async (item, patch) => {
        const r = await fetch('/api/admin/faq', {
            method: 'PATCH',
            headers: { ...auth(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.id, ...patch })
        });
        if (!r.ok) { alert('Güncellenemedi'); return; }
        load(lang);
    };

    const remove = async (id) => {
        if (!confirm('Bu SSS kaydını silmek istediğinize emin misiniz?')) return;
        await fetch(`/api/admin/faq?id=${id}`, { method: 'DELETE', headers: auth() });
        load(lang);
    };

    const moveSort = async (item, delta) => {
        await update(item, { sort_order: (item.sort_order || 0) + delta });
    };

    return (
        <div>
            <div style={{ ...cardS, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', marginLeft: 'auto' }}>
                    {items.length} kayıt
                </span>
            </div>

            <div style={cardS}>
                <h3 style={{ color: '#f1f5f9', marginTop: 0 }}>Yeni SSS Ekle</h3>
                <input
                    style={{ ...inputS, marginBottom: 8 }}
                    placeholder="Soru başlığı (örn. LDM nedir?)"
                    value={draft.question}
                    onChange={e => setDraft({ ...draft, question: e.target.value })}
                />
                <textarea
                    style={{ ...inputS, marginBottom: 8, minHeight: 90, resize: 'vertical' }}
                    placeholder="Cevap metni"
                    value={draft.answer}
                    onChange={e => setDraft({ ...draft, answer: e.target.value })}
                />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="number"
                        style={{ ...inputS, width: 120 }}
                        placeholder="Sıra"
                        value={draft.sort_order}
                        onChange={e => setDraft({ ...draft, sort_order: e.target.value })}
                    />
                    <button onClick={create} disabled={busy} className="ai-btn ai-btn-primary" style={{ height: 36, opacity: busy ? 0.5 : 1 }}>
                        <div className="ai-btn-inner" style={{ background: '#10b981', color: 'white' }}>
                            {busy ? '...' : '+ Ekle'}
                        </div>
                    </button>
                    {feedback && (
                        <span style={{ color: feedback.type === 'ok' ? '#10b981' : '#ef4444', fontSize: '0.85rem' }}>
                            {feedback.type === 'ok' ? '✓ ' : '⚠ '}{feedback.text}
                        </span>
                    )}
                </div>
            </div>

            {items.length === 0 && (
                <div style={{ ...cardS, color: '#64748b', textAlign: 'center' }}>
                    Bu dilde kayıt yok. Boş bırakırsanız ana sayfada bundle JSON'daki varsayılan SSS gösterilir.
                </div>
            )}

            {items.map((it, idx) => (
                <div key={it.id} style={cardS}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                            #{it.id} • sıra {it.sort_order} {!it.is_active && '• PASİF'}
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {idx > 0 && (
                                <button onClick={() => moveSort(it, -1)} className="ai-btn" style={{ height: 28 }}>
                                    <div className="ai-btn-inner" style={{ padding: '0 8px', fontSize: '0.75rem' }}>▲</div>
                                </button>
                            )}
                            {idx < items.length - 1 && (
                                <button onClick={() => moveSort(it, 1)} className="ai-btn" style={{ height: 28 }}>
                                    <div className="ai-btn-inner" style={{ padding: '0 8px', fontSize: '0.75rem' }}>▼</div>
                                </button>
                            )}
                            <button
                                onClick={() => update(it, { is_active: !it.is_active })}
                                className="ai-btn"
                                style={{ height: 28 }}
                            >
                                <div className="ai-btn-inner" style={{ padding: '0 10px', fontSize: '0.75rem' }}>
                                    {it.is_active ? 'Gizle' : 'Aktif'}
                                </div>
                            </button>
                            <button onClick={() => remove(it.id)} className="ai-btn ai-btn-danger" style={{ height: 28 }}>
                                <div className="ai-btn-inner" style={{ padding: '0 10px', fontSize: '0.75rem' }}>Sil</div>
                            </button>
                        </div>
                    </div>
                    <input
                        style={{ ...inputS, marginBottom: 8, fontWeight: 600 }}
                        defaultValue={it.question}
                        onBlur={e => { if (e.target.value !== it.question) update(it, { question: e.target.value }); }}
                    />
                    <textarea
                        style={{ ...inputS, minHeight: 80, resize: 'vertical' }}
                        defaultValue={it.answer}
                        onBlur={e => { if (e.target.value !== it.answer) update(it, { answer: e.target.value }); }}
                    />
                </div>
            ))}
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

// ---- Document logs (CMR / Invoice / Packing List) --------------------------
const DOC_TYPES = [
    ['', 'Tümü'],
    ['cmr', 'CMR'],
    ['invoice', 'Fatura'],
    ['packing', 'Çeki Listesi'],
];
const DOC_LABEL = { cmr: 'CMR', invoice: 'Fatura', packing: 'Çeki Listesi' };
const DOC_COLOR = { cmr: '#3b82f6', invoice: '#22c55e', packing: '#f59e0b' };

const DocumentLogs = () => {
    const [rows, setRows] = useState([]);
    const [type, setType] = useState('');
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        const q = type ? `?type=${type}` : '';
        const r = await fetch(`/api/admin/documents${q}`, { headers: auth() });
        const j = await r.json().catch(() => ({}));
        setRows(j.items || []);
        setLoading(false);
    };
    useEffect(() => { load(); }, [type]);

    const del = async (id) => {
        if (!window.confirm('Bu log kaydını sil?')) return;
        await fetch(`/api/admin/documents?id=${id}`, { method: 'DELETE', headers: auth() });
        load();
    };

    return (
        <div>
            <h2 style={{ color: '#f8fafc' }}>Belge Logları</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {DOC_TYPES.map(([k, l]) => (
                    <button
                        key={k || 'all'}
                        onClick={() => setType(k)}
                        className="ai-btn"
                        style={{ height: 32 }}
                    >
                        <div className="ai-btn-inner" style={{
                            fontSize: '0.82rem',
                            background: type === k ? '#3b82f6' : undefined,
                            color: type === k ? '#fff' : undefined,
                        }}>{l}</div>
                    </button>
                ))}
                <span style={{ color: '#64748b', alignSelf: 'center', fontSize: '0.85rem' }}>
                    {loading ? '…' : `${rows.length} kayıt`}
                </span>
            </div>

            {!loading && rows.length === 0 && <div style={{ color: '#64748b' }}>Kayıt yok.</div>}
            {rows.map(r => (
                <div key={r.id} style={{ ...cardS, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                        flex: '0 0 auto', background: DOC_COLOR[r.type] || '#64748b', color: '#fff',
                        borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem', fontWeight: 700,
                    }}>{DOC_LABEL[r.type] || r.type}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.title || '(başlıksız)'}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                            {r.email
                                ? `${[r.first_name, r.last_name].filter(Boolean).join(' ')} · ${r.email}`.trim()
                                : 'Misafir'}
                        </div>
                    </div>
                    <span style={{ color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(r.created_at).toLocaleString()}
                    </span>
                    <button onClick={() => del(r.id)} className="ai-btn ai-btn-danger" style={{ height: 30 }}>
                        <div className="ai-btn-inner" style={{ fontSize: '0.8rem' }}>Sil</div>
                    </button>
                </div>
            ))}
        </div>
    );
};

// ---- Pricing management ----------------------------------------------------
const PLANS = ['individual', 'corporate'];
const PERIODS = ['monthly', 'yearly'];
const CURRENCIES = ['TRY', 'USD', 'EUR'];
const CORP_TIERS = [3, 5, 10, 20, 30, 50, 100];

const PricingManager = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState({ plan: 'individual', tier: '', period: 'monthly', currency: 'TRY', amount: '', vat_rate: '20', active: true });

    const load = async () => {
        setLoading(true);
        const r = await fetch('/api/admin/pricing', { headers: auth() });
        const j = await r.json().catch(() => ({}));
        setRows(j.pricing || []);
        setLoading(false);
    };
    useEffect(() => { load(); }, []);

    const save = async (row) => {
        await fetch('/api/admin/pricing', {
            method: 'PUT', headers: { ...auth(), 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plan: row.plan, tier: row.plan === 'corporate' ? parseInt(row.tier, 10) : null,
                period: row.period, currency: row.currency,
                amount: parseFloat(row.amount) || 0, vat_rate: parseFloat(row.vat_rate) || 0, active: row.active !== false,
            }),
        });
        await load();
    };
    const addRow = async () => { await save(draft); setDraft({ ...draft, amount: '' }); };
    const del = async (id) => { if (!window.confirm('Sil?')) return; await fetch(`/api/admin/pricing?id=${id}`, { method: 'DELETE', headers: auth() }); await load(); };

    const inp = { background: '#0b1220', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' };
    return (
        <div>
            <h2 style={{ color: '#f8fafc' }}>Fiyatlandırma</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16, background: '#111827', padding: 12, borderRadius: 10 }}>
                <select value={draft.plan} onChange={e => setDraft({ ...draft, plan: e.target.value })} style={inp}>{PLANS.map(p => <option key={p} value={p}>{p}</option>)}</select>
                {draft.plan === 'corporate' && (
                    <select value={draft.tier} onChange={e => setDraft({ ...draft, tier: e.target.value })} style={inp}>
                        <option value="">tier</option>{CORP_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                )}
                <select value={draft.period} onChange={e => setDraft({ ...draft, period: e.target.value })} style={inp}>{PERIODS.map(p => <option key={p} value={p}>{p}</option>)}</select>
                <select value={draft.currency} onChange={e => setDraft({ ...draft, currency: e.target.value })} style={inp}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <input placeholder="amount" value={draft.amount} onChange={e => setDraft({ ...draft, amount: e.target.value })} style={{ ...inp, width: 90 }} />
                <input placeholder="vat %" value={draft.vat_rate} onChange={e => setDraft({ ...draft, vat_rate: e.target.value })} style={{ ...inp, width: 70 }} />
                <button onClick={addRow} className="ai-btn" style={{ height: 34 }}><div className="ai-btn-inner" style={{ background: '#3b82f6', color: '#fff' }}>Ekle / Güncelle</div></button>
            </div>
            {loading ? <p>…</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead><tr style={{ textAlign: 'left', color: '#94a3b8' }}><th>Plan</th><th>Tier</th><th>Period</th><th>Cur</th><th>Amount</th><th>VAT%</th><th>Active</th><th></th></tr></thead>
                    <tbody>
                        {rows.map(r => (
                            <tr key={r.id} style={{ borderTop: '1px solid #1f2937' }}>
                                <td style={{ padding: '6px 4px' }}>{r.plan}</td>
                                <td>{r.tier ?? '—'}</td>
                                <td>{r.period}</td>
                                <td>{r.currency}</td>
                                <td><input defaultValue={r.amount} onBlur={e => save({ ...r, amount: e.target.value })} style={{ ...inp, width: 90 }} /></td>
                                <td><input defaultValue={r.vat_rate} onBlur={e => save({ ...r, vat_rate: e.target.value })} style={{ ...inp, width: 60 }} /></td>
                                <td><input type="checkbox" defaultChecked={r.active} onChange={e => save({ ...r, active: e.target.checked })} /></td>
                                <td><button onClick={() => del(r.id)} style={{ background: 'transparent', border: '1px solid #7f1d1d', color: '#fca5a5', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Sil</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

// ---- Subscriptions / users / payments overview -----------------------------
const SubscriptionsManager = () => {
    const [view, setView] = useState('list');
    const [data, setData] = useState(null);
    const [tick, setTick] = useState(0);
    const [busy, setBusy] = useState(null);
    const [pendingCount, setPendingCount] = useState(0);
    useEffect(() => {
        setData(null);
        const q = view === 'list' ? '' : `?view=${view}`;
        fetch(`/api/admin/subscriptions${q}`, { headers: auth() })
            .then(r => r.json()).then(setData).catch(() => setData({}));
    }, [view, tick]);
    // Always keep a live count of pending requests so the "Abonelikler" tab can
    // surface a badge even while the admin is viewing another tab.
    useEffect(() => {
        fetch('/api/admin/subscriptions', { headers: auth() })
            .then(r => r.json())
            .then(d => setPendingCount((d.subscriptions || []).filter(s => s.status === 'pending').length))
            .catch(() => {});
    }, [tick]);

    const act = async (id, action) => {
        if (action === 'reject' && !window.confirm('Bu abonelik talebini reddet?')) return;
        if (action === 'approve' && !window.confirm('Bu talebi onayla ve erişimi aç?')) return;
        setBusy(id);
        try {
            await fetch('/api/admin/subscriptions', {
                method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action }),
            });
            setTick(t => t + 1);
        } finally { setBusy(null); }
    };

    const money = (a, c) => `${c} ${(Number(a) || 0).toLocaleString()}`;
    const payMethod = (p) => (p === 'manual' ? 'IBAN/EFT' : p === 'paytr' ? 'Kredi Kartı' : (p || '—'));
    const rawObj = (r) => { try { return typeof r === 'string' ? JSON.parse(r) : (r || null); } catch { return null; } };
    // List price struck-through next to a free (0) amount during the campaign.
    const freePrice = (amount, currency) => (
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
            {Number(amount) > 0 && <span style={{ color: '#94a3b8', textDecoration: 'line-through' }}>{money(amount, currency)}</span>}
            <span style={{ color: '#6ee7b7', fontWeight: 700 }}>{money(0, currency)}</span>
        </span>
    );
    const td = { padding: '6px 8px', borderTop: '1px solid #1f2937' };
    const th = { textAlign: 'left', color: '#94a3b8', padding: '6px 8px' };

    return (
        <div>
            <h2 style={{ color: '#f8fafc' }}>Abonelikler</h2>
            <nav style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {[['stats', 'Özet'], ['list', 'Abonelikler'], ['users', 'Kullanıcılar'], ['payments', 'Ödemeler']].map(([k, l]) => (
                    <button key={k} onClick={() => setView(k)} className="ai-btn" style={{ height: 32 }}>
                        <div className="ai-btn-inner" style={{ background: view === k ? '#3b82f6' : 'transparent', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {l}
                            {k === 'list' && pendingCount > 0 && (
                                <span style={{ background: '#f59e0b', color: '#1f1300', fontSize: '0.7rem', fontWeight: 800,
                                    borderRadius: 999, padding: '1px 7px', lineHeight: '16px' }}>{pendingCount}</span>
                            )}
                        </div>
                    </button>
                ))}
            </nav>
            {pendingCount > 0 && (
                <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 9,
                    background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.45)', color: '#fbbf24',
                    display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700 }}>⚠ {pendingCount} bekleyen abonelik talebi</span>
                    {view !== 'list' && (
                        <button onClick={() => setView('list')} style={{ background: '#f59e0b', color: '#1f1300',
                            border: 'none', borderRadius: 7, padding: '5px 12px', fontWeight: 700, cursor: 'pointer' }}>
                            Talepleri gör
                        </button>
                    )}
                </div>
            )}
            {!data ? <p>…</p> : view === 'stats' ? (
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {[['Kullanıcı', data.stats?.users], ['Firma', data.stats?.companies], ['Aktif abonelik', data.stats?.activeSubs]].map(([l, v]) => (
                        <div key={l} style={{ background: '#111827', padding: 18, borderRadius: 10, minWidth: 140 }}>
                            <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{l}</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>{v ?? 0}</div>
                        </div>
                    ))}
                    <div style={{ background: '#111827', padding: 18, borderRadius: 10, minWidth: 180 }}>
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>MRR</div>
                        {(data.stats?.mrr || []).map(m => <div key={m.currency} style={{ color: '#fff' }}>{money(m.mrr, m.currency)}</div>)}
                    </div>
                    <div style={{ background: '#111827', padding: 18, borderRadius: 10, minWidth: 180 }}>
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Bu ay tahsilat</div>
                        {(data.stats?.paidThisMonth || []).map(m => <div key={m.currency} style={{ color: '#fff' }}>{money(m.total, m.currency)} ({m.n})</div>)}
                    </div>
                </div>
            ) : view === 'users' ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead><tr><th style={th}>Email</th><th style={th}>Ad</th><th style={th}>Tip</th><th style={th}>Firma</th><th style={th}>Doğrulı</th><th style={th}>Kayıt</th></tr></thead>
                    <tbody>{(data.users || []).map(u => (
                        <tr key={u.id}><td style={td}>{u.email}</td><td style={td}>{u.first_name} {u.last_name}</td><td style={td}>{u.account_type}</td><td style={td}>{u.company_name || '—'}</td><td style={td}>{u.email_verified ? '✓' : '—'}</td><td style={td}>{new Date(u.created_at).toLocaleDateString()}</td></tr>
                    ))}</tbody>
                </table>
            ) : view === 'payments' ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead><tr><th style={th}>Tarih</th><th style={th}>Tutar</th><th style={th}>KDV</th><th style={th}>Yöntem</th><th style={th}>Durum</th><th style={th}>Tür</th><th style={th}>Kullanıcı/Firma</th></tr></thead>
                    <tbody>{(data.payments || []).map(p => {
                        const promo = rawObj(p.raw)?.promo;
                        return (
                        <tr key={p.id}><td style={td}>{new Date(p.paid_at || p.created_at).toLocaleDateString()}</td><td style={td}>{promo ? freePrice(rawObj(p.raw).listAmount, p.currency) : money(p.amount, p.currency)}</td><td style={td}>{money(p.vat_amount, p.currency)}</td><td style={td}>{payMethod(p.provider)}</td><td style={td}>{p.status === 'paid' ? 'Tahsil edildi' : p.status}</td><td style={td}>{p.kind}</td><td style={td}>{p.company_name || p.user_email || '—'}</td></tr>
                        );
                    })}</tbody>
                </table>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead><tr><th style={th}>Plan</th><th style={th}>Period</th><th style={th}>Tier</th><th style={th}>Tutar</th><th style={th}>Durum</th><th style={th}>Bitiş</th><th style={th}>Kullanıcı/Firma</th><th style={th}>İletişim</th><th style={th}>İşlem</th></tr></thead>
                    <tbody>{(data.subscriptions || []).map(s => {
                        const name = [s.first_name, s.last_name].filter(Boolean).join(' ');
                        const isPending = s.status === 'pending';
                        return (
                        <tr key={s.id} style={isPending ? { background: 'rgba(251,191,36,0.06)' } : undefined}>
                            <td style={td}>{s.plan}</td>
                            <td style={td}>{s.period}</td>
                            <td style={td}>{s.tier ?? '—'}</td>
                            <td style={td}>{PROMO_FREE ? freePrice(s.amount, s.currency) : money(s.amount, s.currency)}</td>
                            <td style={{ ...td, color: isPending ? '#fbbf24' : s.status === 'active' ? '#34d399' : '#94a3b8', fontWeight: 600 }}>
                                {isPending ? 'Onay bekliyor' : s.status}{s.cancel_at_period_end ? ' (iptal)' : ''}
                            </td>
                            <td style={td}>{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : '—'}</td>
                            <td style={td}>{s.company_name || name || s.user_email || '—'}</td>
                            <td style={td}>
                                <div>{s.user_email || '—'}</div>
                                {s.phone && <div style={{ color: '#94a3b8' }}>{s.phone}</div>}
                            </td>
                            <td style={td}>
                                {isPending ? (
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button onClick={() => act(s.id, 'approve')} disabled={busy === s.id}
                                            style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>
                                            {busy === s.id ? '…' : 'Onayla'}
                                        </button>
                                        <button onClick={() => act(s.id, 'reject')} disabled={busy === s.id}
                                            style={{ background: 'transparent', color: '#fca5a5', border: '1px solid #7f1d1d', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                            Reddet
                                        </button>
                                    </div>
                                ) : '—'}
                            </td>
                        </tr>
                        );
                    })}</tbody>
                </table>
            )}
        </div>
    );
};

// ---- User management & tracking --------------------------------------------
const UsersManager = () => {
    const [users, setUsers] = useState(null);
    const [q, setQ] = useState('');
    const [filter, setFilter] = useState('all'); // all | unverified | suspended
    const [busy, setBusy] = useState(null);       // id currently acting on
    const [note, setNote] = useState('');

    const load = () => {
        setUsers(null);
        fetch('/api/admin/users', { headers: auth() })
            .then(r => r.json()).then(j => setUsers(j.users || [])).catch(() => setUsers([]));
    };
    useEffect(load, []);

    const act = async (id, action, confirmMsg) => {
        if (confirmMsg && !window.confirm(confirmMsg)) return;
        setBusy(id); setNote('');
        try {
            const r = await fetch('/api/admin/users', {
                method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action }),
            });
            const j = await r.json();
            if (action === 'resend-verify') setNote(j.ok ? 'Doğrulama e-postası gönderildi.' : 'E-posta gönderilemedi.');
            load();
        } finally { setBusy(null); }
    };

    const td = { padding: '6px 8px', borderTop: '1px solid #1f2937', verticalAlign: 'top' };
    const th = { textAlign: 'left', color: '#94a3b8', padding: '6px 8px' };
    const btn = (bg) => ({ background: bg, border: 'none', color: '#fff', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: '0.78rem', marginRight: 4, marginBottom: 4 });

    const list = (users || []).filter(u => {
        if (filter === 'unverified' && u.email_verified) return false;
        if (filter === 'suspended' && u.status !== 'suspended') return false;
        const s = q.trim().toLowerCase();
        if (!s) return true;
        return (u.email || '').toLowerCase().includes(s)
            || `${u.first_name} ${u.last_name}`.toLowerCase().includes(s)
            || (u.company_name || '').toLowerCase().includes(s);
    });

    return (
        <div>
            <h2 style={{ color: '#f8fafc' }}>Kullanıcı Yönetimi</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Ara: e-posta / ad / firma"
                    style={{ background: '#111827', border: '1px solid #1f2937', color: '#e2e8f0', borderRadius: 8, padding: '8px 12px', minWidth: 220 }} />
                {[['all', 'Tümü'], ['unverified', 'Doğrulanmamış'], ['suspended', 'Askıda']].map(([k, l]) => (
                    <button key={k} onClick={() => setFilter(k)} className="ai-btn" style={{ height: 30 }}>
                        <div className="ai-btn-inner" style={{ background: filter === k ? '#3b82f6' : 'transparent', color: '#fff', fontSize: '0.8rem' }}>{l}</div>
                    </button>
                ))}
                <button onClick={load} className="ai-btn" style={{ height: 30 }}><div className="ai-btn-inner" style={{ fontSize: '0.8rem' }}>Yenile</div></button>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{list.length} kullanıcı</span>
            </div>
            {note && <p style={{ color: '#34d399', fontSize: '0.85rem' }}>{note}</p>}
            {!users ? <p>…</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead><tr>
                        <th style={th}>Email</th><th style={th}>Ad</th><th style={th}>Tip</th><th style={th}>Firma</th>
                        <th style={th}>Doğrulı</th><th style={th}>Durum</th><th style={th}>Abonelik</th>
                        <th style={th}>Belge</th><th style={th}>Kullanım</th><th style={th}>Kayıt</th><th style={th}>İşlem</th>
                    </tr></thead>
                    <tbody>{list.map(u => (
                        <tr key={u.id}>
                            <td style={td}>{u.email}</td>
                            <td style={td}>{u.first_name} {u.last_name}</td>
                            <td style={td}>{u.account_type}</td>
                            <td style={td}>{u.company_name || '—'}</td>
                            <td style={td}>{u.email_verified ? '✓' : '—'}</td>
                            <td style={{ ...td, color: u.status === 'suspended' ? '#fca5a5' : '#34d399' }}>{u.status}</td>
                            <td style={td}>{u.sub_plan ? `${u.sub_plan} (${u.sub_status})` : '—'}</td>
                            <td style={td}>{u.document_count}</td>
                            <td style={td}>{u.usage_count}</td>
                            <td style={td}>{new Date(u.created_at).toLocaleDateString()}</td>
                            <td style={td}>
                                {!u.email_verified && (
                                    <button disabled={busy === u.id} style={btn('#0369a1')} onClick={() => act(u.id, 'resend-verify')}>Doğrulama gönder</button>
                                )}
                                {!u.email_verified && (
                                    <button disabled={busy === u.id} style={btn('#334155')} onClick={() => act(u.id, 'verify', 'Bu kullanıcıyı doğrulanmış olarak işaretle?')}>Doğrula</button>
                                )}
                                {u.status === 'suspended'
                                    ? <button disabled={busy === u.id} style={btn('#15803d')} onClick={() => act(u.id, 'activate')}>Aktifleştir</button>
                                    : <button disabled={busy === u.id} style={btn('#a16207')} onClick={() => act(u.id, 'suspend', 'Bu kullanıcıyı askıya al?')}>Askıya al</button>}
                                <button disabled={busy === u.id} style={btn('#7f1d1d')} onClick={() => act(u.id, 'delete', `${u.email} kullanıcısını ve tüm verilerini kalıcı olarak sil?`)}>Sil</button>
                            </td>
                        </tr>
                    ))}</tbody>
                </table>
            )}
        </div>
    );
};

// ---- Live chat (visitor ⇄ admin) -----------------------------------------
const fmtDateTime = (iso) => { try { return new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
const fmtTime = (iso) => { try { return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

// Conversation language → flag for the chat tab (mirrors SUPPORTED_LANGS).
const LANG_FLAGS = { en: '🇬🇧', tr: '🇹🇷', de: '🇩🇪', ru: '🇷🇺', fr: '🇫🇷', ar: '🇸🇦' };

const ChatManager = () => {
    const [convs, setConvs] = useState([]);
    const [filter, setFilter] = useState('all');   // all | open | closed
    const [sel, setSel] = useState(null);          // selected conversation id
    const [conv, setConv] = useState(null);        // selected conversation meta
    const [msgs, setMsgs] = useState([]);
    const [reply, setReply] = useState('');
    const [busy, setBusy] = useState(false);
    const [blocks, setBlocks] = useState([]);
    const [showBlocks, setShowBlocks] = useState(false);
    const lastId = useRef(0);
    const bodyRef = useRef(null);
    const filterRef = useRef(filter);
    filterRef.current = filter;
    const selRef = useRef(sel);
    selRef.current = sel;

    const loadList = async () => {
        try {
            const r = await fetch(`/api/admin/chat?status=${filterRef.current}`, { headers: auth() });
            const j = await r.json();
            setConvs(j.items || []);
        } catch { /* noop */ }
    };

    const mergeMsgs = (incoming) => {
        if (!incoming?.length) return;
        setMsgs((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const fresh = incoming.filter((m) => !seen.has(m.id));
            if (!fresh.length) return prev;
            const next = [...prev, ...fresh];
            lastId.current = next.reduce((a, m) => Math.max(a, m.id), lastId.current);
            return next;
        });
    };

    const openConv = async (id) => {
        setSel(id); lastId.current = 0; setMsgs([]); setConv(null);
        try {
            const r = await fetch(`/api/admin/chat?id=${id}&after=0`, { headers: auth() });
            const j = await r.json();
            setConv(j.conversation || null);
            setMsgs(j.messages || []);
            lastId.current = (j.messages || []).reduce((a, m) => Math.max(a, m.id), 0);
            loadList();
        } catch { /* noop */ }
    };

    const loadBlocks = async () => {
        try {
            const r = await fetch('/api/admin/chat?blocks=1', { headers: auth() });
            const j = await r.json();
            setBlocks(j.blocks || []);
        } catch { /* noop */ }
    };

    const blockConv = async (type) => {
        const value = type === 'ip' ? conv?.ip : conv?.visitor_email;
        if (!value) { window.alert(type === 'ip' ? 'Bu konuşmada IP bilgisi yok.' : 'Bu konuşmada e-posta yok.'); return; }
        const label = type === 'ip' ? `IP ${value}` : `e-posta ${value}`;
        if (!window.confirm(`${label} engellensin mi? Bu kaynaktan gelen sohbetler reddedilecek.`)) return;
        await fetch('/api/admin/chat', {
            method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'block', type, value }),
        });
        if (conv) setConv({ ...conv, status: 'closed' });
        loadBlocks(); loadList();
    };

    const unblock = async (id) => {
        await fetch('/api/admin/chat', {
            method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'unblock', id }),
        });
        loadBlocks();
    };

    // List polling (refresh + filter change) + blocklist on mount.
    useEffect(() => { loadList(); }, [filter]);
    useEffect(() => { loadBlocks(); }, []);
    useEffect(() => { const id = setInterval(loadList, 5000); return () => clearInterval(id); }, []);

    // Thread polling for the selected conversation.
    useEffect(() => {
        if (!sel) return;
        const tick = async () => {
            try {
                const r = await fetch(`/api/admin/chat?id=${selRef.current}&after=${lastId.current}`, { headers: auth() });
                const j = await r.json();
                mergeMsgs(j.messages);
                if (j.conversation) setConv(j.conversation);
            } catch { /* noop */ }
        };
        const t = setInterval(tick, 3000);
        return () => clearInterval(t);
    }, [sel]);

    useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [msgs]);

    const sendReply = async () => {
        const body = reply.trim();
        if (!body || !sel || busy) return;
        setBusy(true);
        try {
            const r = await fetch('/api/admin/chat', {
                method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId: sel, body }),
            });
            const j = await r.json();
            if (j.message) mergeMsgs([j.message]);
            setReply('');
            loadList();
        } finally { setBusy(false); }
    };

    const act = async (action) => {
        if (!sel) return;
        await fetch('/api/admin/chat', {
            method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: sel, action }),
        });
        if (conv) setConv({ ...conv, status: action === 'close' ? 'closed' : 'open' });
        loadList();
    };

    const del = async (id) => {
        if (!window.confirm('Bu konuşmayı ve tüm mesajlarını kalıcı olarak silmek istediğinize emin misiniz?')) return;
        await fetch(`/api/admin/chat?id=${id}`, { method: 'DELETE', headers: auth() });
        if (sel === id) { setSel(null); setConv(null); setMsgs([]); }
        loadList();
    };

    const FILTERS = [['all', 'Tümü'], ['open', 'Açık'], ['closed', 'Kapalı']];
    const visitorLabel = (c) => c.visitor_name?.trim() || c.visitor_email?.trim() || (c.user_id ? `Üye #${c.user_id}` : `Ziyaretçi #${c.id}`);
    const langFlag = (code) => LANG_FLAGS[(code || '').toLowerCase()] || '';

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <h2 style={{ color: '#f8fafc', margin: 0, flex: 1 }}>Canlı Destek</h2>
                <button onClick={() => { setShowBlocks((s) => !s); loadBlocks(); }} style={miniBtn(showBlocks ? '#3b82f6' : '#334155')}>
                    Engellenenler{blocks.length > 0 ? ` (${blocks.length})` : ''}
                </button>
            </div>

            {showBlocks && (
                <div style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                    {blocks.length === 0 && <div style={{ color: '#64748b', fontSize: '0.84rem' }}>Engellenmiş IP veya e-posta yok.</div>}
                    {blocks.map((b) => (
                        <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: b.type === 'ip' ? 'rgba(59,130,246,0.2)' : 'rgba(234,179,8,0.2)', color: b.type === 'ip' ? '#93c5fd' : '#fde68a' }}>
                                {b.type === 'ip' ? 'IP' : 'E-POSTA'}
                            </span>
                            <span style={{ flex: 1, minWidth: 0, color: '#e2e8f0', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.value}</span>
                            <button onClick={() => unblock(b.id)} style={miniBtn('#16a34a')}>Kaldır</button>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', height: 'calc(100vh - 170px)' }}>
                {/* Conversation list */}
                <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: 6, padding: 10, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {FILTERS.map(([k, l]) => (
                            <button key={k} onClick={() => setFilter(k)} style={{
                                flex: 1, border: 'none', borderRadius: 8, padding: '6px 0', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit',
                                background: filter === k ? '#3b82f6' : '#1e293b', color: filter === k ? '#fff' : '#94a3b8',
                            }}>{l}</button>
                        ))}
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {convs.length === 0 && <div style={{ padding: 16, color: '#64748b', fontSize: '0.85rem' }}>Henüz konuşma yok.</div>}
                        {convs.map((c) => (
                            <button key={c.id} onClick={() => openConv(c.id)} style={{
                                display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                                background: sel === c.id ? 'rgba(59,130,246,0.18)' : 'transparent',
                                borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '10px 12px', fontFamily: 'inherit',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {langFlag(c.lang) && <span title={c.lang} style={{ fontSize: '0.95rem', lineHeight: 1 }}>{langFlag(c.lang)}</span>}
                                    <span style={{ flex: 1, minWidth: 0, color: '#e2e8f0', fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{visitorLabel(c)}</span>
                                    {c.status === 'closed' && <span style={{ color: '#64748b', fontSize: '0.66rem', border: '1px solid #334155', borderRadius: 6, padding: '0 5px' }}>kapalı</span>}
                                    {c.admin_unread > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 999, fontSize: '0.66rem', fontWeight: 800, minWidth: 18, height: 18, lineHeight: '18px', textAlign: 'center', padding: '0 5px' }}>{c.admin_unread}</span>}
                                </div>
                                <div style={{ color: '#94a3b8', fontSize: '0.76rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                                    {c.last_sender === 'admin' ? '↩ ' : ''}{c.last_message || '—'}
                                </div>
                                <div style={{ color: '#475569', fontSize: '0.68rem', marginTop: 2 }}>{fmtDateTime(c.last_message_at)}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Thread */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
                    {!sel ? (
                        <div style={{ margin: 'auto', color: '#64748b', fontSize: '0.9rem' }}>Soldan bir konuşma seçin.</div>
                    ) : (
                        <>
                            {/* Thread header + visitor meta */}
                            <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ color: '#f1f5f9', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {conv && langFlag(conv.lang) && <span title={conv.lang} style={{ fontSize: '1.05rem', lineHeight: 1 }}>{langFlag(conv.lang)}</span>}
                                        {conv ? visitorLabel(conv) : '…'}
                                    </div>
                                    {conv && (
                                        <div style={{ color: '#64748b', fontSize: '0.72rem' }}>
                                            {conv.visitor_email ? conv.visitor_email + ' • ' : ''}{conv.visitor_phone ? conv.visitor_phone + ' • ' : ''}{conv.user_id ? 'Üye #' + conv.user_id + ' • ' : ''}IP: {conv.ip || '—'} • {fmtDateTime(conv.created_at)}
                                        </div>
                                    )}
                                </div>
                                {conv?.status === 'open'
                                    ? <button onClick={() => act('close')} style={miniBtn('#334155')}>Kapat</button>
                                    : <button onClick={() => act('reopen')} style={miniBtn('#16a34a')}>Yeniden Aç</button>}
                                {conv?.ip && <button onClick={() => blockConv('ip')} style={miniBtn('#9a3412')} title={conv.ip}>IP engelle</button>}
                                {conv?.visitor_email && <button onClick={() => blockConv('email')} style={miniBtn('#9a3412')} title={conv.visitor_email}>E-posta engelle</button>}
                                <button onClick={() => del(sel)} style={miniBtn('#7f1d1d')}>Sil</button>
                            </div>

                            {/* Messages */}
                            <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {msgs.map((m) => (
                                    <div key={m.id} style={{
                                        alignSelf: m.sender === 'admin' ? 'flex-end' : 'flex-start', maxWidth: '75%',
                                        background: m.sender === 'admin' ? '#2563eb' : '#1e293b',
                                        color: m.sender === 'admin' ? '#fff' : '#e2e8f0',
                                        padding: '8px 11px',
                                        borderRadius: m.sender === 'admin' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                                        fontSize: '0.86rem', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                    }}>
                                        {linkify(m.body, { color: m.sender === 'admin' ? '#dbeafe' : '#93c5fd', textDecoration: 'underline' })}
                                        <div style={{ fontSize: '0.62rem', opacity: 0.6, marginTop: 3, textAlign: 'right' }}>{fmtTime(m.created_at)}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Reply box */}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: 10, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                                <textarea
                                    value={reply}
                                    onChange={(e) => setReply(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                                    placeholder="Yanıtınızı yazın…  (Enter ile gönder)"
                                    rows={2}
                                    style={{ ...inputS, flex: 1, resize: 'none', maxHeight: 120 }}
                                />
                                <button onClick={sendReply} disabled={busy || !reply.trim()} className="ai-btn ai-btn-primary" style={{ height: 42, flexShrink: 0 }}>
                                    <div className="ai-btn-inner" style={{ background: '#3b82f6', color: '#fff', padding: '0 16px' }}>{busy ? '…' : 'Gönder'}</div>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
const miniBtn = (bg) => ({ border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit', background: bg, color: '#fff' });

const Admin = () => {
    const [user, setUser] = useState(null);
    const [tab, setTab] = useState('flags');
    const [chatUnread, setChatUnread] = useState(0);

    // Global CSS pins body to overflow:hidden / height:100vh for the 3D viewer
    // pages. The admin dashboard is content-heavy and needs native scrolling,
    // so we restore body overflow while mounted and revert on unmount.
    useEffect(() => {
        const prevBodyOv = document.body.style.overflow;
        const prevBodyH  = document.body.style.height;
        const prevHtmlOv = document.documentElement.style.overflow;
        document.body.style.overflow = 'auto';
        document.body.style.height = 'auto';
        document.documentElement.style.overflow = 'auto';
        return () => {
            document.body.style.overflow = prevBodyOv;
            document.body.style.height = prevBodyH;
            document.documentElement.style.overflow = prevHtmlOv;
        };
    }, []);

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

    // Poll the unread-chat count so the sidebar badge stays live regardless of
    // which tab is open.
    useEffect(() => {
        if (!user) return;
        let stop = false;
        const tick = async () => {
            try {
                const r = await fetch('/api/admin/chat?status=open', { headers: auth() });
                if (!r.ok) return;
                const j = await r.json();
                if (!stop) setChatUnread(j.unread || 0);
            } catch { /* noop */ }
        };
        tick();
        const id = setInterval(tick, 12000);
        return () => { stop = true; clearInterval(id); };
    }, [user]);

    if (!user) return <div style={{ minHeight: '100vh', background: '#0b1220' }}><Login onAuthed={setUser} /></div>;

    // Grouped, vertical navigation. Keys match the tab conditionals below.
    const NAV = [
        { group: 'İçerik', items: [
            ['site',      'Site Yönetimi'],
            ['faq',       'SSS (FAQ)'],
            ['assets',    'Site Görselleri'],
            ['banners',   'Brandalar'],
            ['flags',     'Bayrak Firmaları'],
            ['references','Referanslar'],
        ] },
        { group: 'Satış', items: [
            ['pricing',   'Fiyatlandırma'],
            ['subs',      'Abonelikler'],
        ] },
        { group: 'Kullanıcılar', items: [
            ['users',     'Kullanıcılar'],
            ['names',     'Ürün İsim Logları'],
            ['documents', 'Belge Logları'],
        ] },
        { group: 'Mesajlar', items: [
            ['chat',      'Canlı Destek'],
            ['contact',   'İletişim'],
            ['advertise', 'Reklam'],
            ['screenshot','Ekran Görüntüleri'],
        ] },
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#0b1220', color: '#e2e8f0', display: 'flex', alignItems: 'flex-start' }}>
            {/* Vertical sidebar */}
            <aside style={{
                flex: '0 0 210px', width: 210, alignSelf: 'stretch',
                background: '#0d1526', borderRight: '1px solid rgba(255,255,255,0.08)',
                position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
                display: 'flex', flexDirection: 'column', padding: '16px 12px', boxSizing: 'border-box',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, paddingLeft: 4 }}>
                    <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '1.05rem', letterSpacing: '.3px' }}>LDM Admin</h1>
                </div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {NAV.map(({ group, items }) => (
                        <div key={group}>
                            <div style={{ color: '#475569', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', padding: '0 8px 6px' }}>{group}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {items.map(([k, l]) => (
                                    <button
                                        key={k}
                                        onClick={() => setTab(k)}
                                        style={{
                                            textAlign: 'left', border: 'none', cursor: 'pointer',
                                            borderRadius: 8, padding: '8px 10px', fontSize: '0.85rem',
                                            fontWeight: tab === k ? 600 : 500, fontFamily: 'inherit',
                                            background: tab === k ? '#3b82f6' : 'transparent',
                                            color: tab === k ? '#fff' : '#cbd5e1',
                                            transition: 'background .12s',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                                        }}
                                    >
                                        <span>{l}</span>
                                        {k === 'chat' && chatUnread > 0 && (
                                            <span style={{ background: '#ef4444', color: '#fff', borderRadius: 999, fontSize: '0.66rem', fontWeight: 800, minWidth: 18, height: 18, lineHeight: '18px', textAlign: 'center', padding: '0 5px' }}>{chatUnread}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
                <a
                    href="/"
                    style={{
                        marginTop: 'auto', textAlign: 'center', textDecoration: 'none',
                        border: '1px solid rgba(255,255,255,0.14)', color: '#cbd5e1',
                        borderRadius: 8, padding: '8px 10px', fontSize: '0.82rem', fontWeight: 600,
                    }}
                >← Siteye dön</a>
                <button
                    onClick={() => { localStorage.removeItem(TOKEN_KEY); setUser(null); }}
                    className="ai-btn"
                    style={{ height: 34, marginTop: 10 }}
                >
                    <div className="ai-btn-inner" style={{ fontSize: '0.82rem' }}>Çıkış</div>
                </button>
            </aside>

            {/* Main content */}
            <main style={{ flex: 1, minWidth: 0, padding: 24, boxSizing: 'border-box' }}>
                {tab === 'references' && <ReferencesManager />}
                {tab === 'documents' && <DocumentLogs />}
                {tab === 'flags'   && <FlagCompanies />}
                {tab === 'banners' && <Banners />}
                {tab === 'assets'  && <SiteAssets />}
                {tab === 'site'    && <SiteContent />}
                {tab === 'faq'     && <FAQManager />}
                {tab === 'names'   && <ProductNameLogs />}
                {tab === 'pricing' && <PricingManager />}
                {tab === 'subs'    && <SubscriptionsManager />}
                {tab === 'users'   && <UsersManager />}
                {tab === 'chat'    && <ChatManager />}
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
