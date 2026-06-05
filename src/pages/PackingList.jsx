import {
    useState, useRef, useEffect, useCallback,
    forwardRef, useImperativeHandle,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n/LanguageContext';
import usePageMeta from '../hooks/usePageMeta';
import { useUsage } from '../usage/UsageContext';
import { useAuth } from '../auth/AuthContext';
import { api } from '../utils/api';
import '../cmr.css';
import '../invoice.css';

/* ------------------------------------------------------------------ *
 * Hand-drawn signature pad (shared shape with the invoice page).
 * ------------------------------------------------------------------ */
const SignaturePad = forwardRef(({ hint, clearLabel }, ref) => {
    const canvasRef = useRef(null);
    const drawing = useRef(false);
    const [hasInk, setHasInk] = useState(false);

    const getCtx = () => (canvasRef.current ? canvasRef.current.getContext('2d') : null);

    useEffect(() => {
        const c = canvasRef.current;
        if (!c) return;
        c.width = c.offsetWidth || 240;
        c.height = c.offsetHeight || 72;
        const ctx = c.getContext('2d');
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#0b3d91';
    }, []);

    const pos = (e) => {
        const c = canvasRef.current;
        const rect = c.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (c.width / rect.width),
            y: (e.clientY - rect.top) * (c.height / rect.height),
        };
    };

    const start = (e) => {
        const ctx = getCtx();
        if (!ctx) return;
        e.preventDefault();
        drawing.current = true;
        const p = pos(e);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        canvasRef.current.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
        if (!drawing.current) return;
        const ctx = getCtx();
        if (!ctx) return;
        e.preventDefault();
        const p = pos(e);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        if (!hasInk) setHasInk(true);
    };
    const end = (e) => {
        if (!drawing.current) return;
        drawing.current = false;
        canvasRef.current?.releasePointerCapture?.(e.pointerId);
    };

    const wipe = () => {
        const c = canvasRef.current;
        const ctx = getCtx();
        if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
        setHasInk(false);
    };

    useImperativeHandle(ref, () => ({
        clear: wipe,
        isEmpty: () => !hasInk,
        toDataURL: () => (hasInk && canvasRef.current ? canvasRef.current.toDataURL('image/png') : ''),
    }));

    return (
        <div className="inv-sign-wrap">
            <canvas
                ref={canvasRef}
                className="inv-sign-canvas"
                onPointerDown={start}
                onPointerMove={move}
                onPointerUp={end}
                onPointerLeave={end}
            />
            {!hasInk && <div className="inv-sign-hint">{hint}</div>}
            <button type="button" className="inv-sign-clear" onClick={wipe}>{clearLabel}</button>
        </div>
    );
});
SignaturePad.displayName = 'PlSignaturePad';

/* ------------------------------------------------------------------ *
 * Image upload box (stamp) — dataURL kept in parent state.
 * ------------------------------------------------------------------ */
const ImageUpload = ({ value, onChange, uploadLabel, removeLabel }) => {
    const onFile = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => onChange(reader.result);
        reader.readAsDataURL(file);
        e.target.value = '';
    };
    return (
        <div className="inv-media">
            {value ? (
                <>
                    <img src={value} alt="" />
                    <button
                        type="button"
                        className="inv-media-clear"
                        onClick={() => onChange('')}
                        aria-label={removeLabel}
                        title={removeLabel}
                    >×</button>
                </>
            ) : (
                <label className="inv-upload-label">
                    <span aria-hidden="true">⬆</span>{uploadLabel}
                    <input type="file" accept="image/*" onChange={onFile} />
                </label>
            )}
        </div>
    );
};

/**
 * Packing List (Çeki Listesi) — fillable export packing-list template.
 * Mirrors ceki.pdf: a sender box spanning the top, a recipient box beside a
 * stamp/signature box, document meta rows, a blue-header goods table with
 * Item No / HS Code / description / qty / net & gross weight that grows to fill
 * the A4 sheet, and an auto-summed totals block. The stamp is uploadable and
 * the signature is hand-drawn. "Print / PDF" prints the sheet 1:1 on A4.
 */
const PackingList = () => {
    const navigate = useNavigate();
    const { t } = useT();
    const { guard } = useUsage();
    const { user } = useAuth();
    usePageMeta({
        title: t('packing.metaTitle'),
        description: t('packing.metaDesc'),
        canonical: 'https://ldmcalculator.com/tools/packing-list',
    });

    const [f, setF] = useState({});
    const [stamp, setStamp] = useState('');
    const emptyRow = () => ({ itemNo: '', hs: '', name: '', qty: '', netKg: '', grossKg: '' });
    const [items, setItems] = useState(() => [emptyRow(), emptyRow(), emptyRow()]);
    const signRef = useRef(null);

    const set = (k) => (e) => setF(prev => ({ ...prev, [k]: e.target.value }));
    const val = (k) => f[k] ?? '';

    // ----- repeater rows -----
    const setItem = (i, k) => (e) =>
        setItems(prev => prev.map((it, idx) => (idx === i ? { ...it, [k]: e.target.value } : it)));
    const addRow = () => setItems(prev => [...prev, emptyRow()]);
    const removeRow = (i) =>
        setItems(prev => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

    // ----- numeric helpers -----
    const num = (s) => { const n = parseFloat(String(s ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
    const fmt = (n) => (n % 1 === 0 ? String(n) : n.toLocaleString(undefined, { maximumFractionDigits: 3 }));

    // ----- totals derived from the line items -----
    const sumQty = items.reduce((s, it) => s + num(it.qty), 0);
    const sumNet = items.reduce((s, it) => s + num(it.netKg), 0);
    const sumGross = items.reduce((s, it) => s + num(it.grossKg), 0);

    // ----- Zoom / fit-to-width (shared shell with CMR / invoice) -----
    const stageRef = useRef(null);
    const sheetRef = useRef(null);
    const [nat, setNat] = useState({ w: 0, h: 0 });
    const [zoom, setZoom] = useState(1);
    const [autoFit, setAutoFit] = useState(true);
    const [guideOpen, setGuideOpen] = useState(true);

    useEffect(() => {
        const el = sheetRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(() => setNat({ w: el.offsetWidth, h: el.offsetHeight }));
        ro.observe(el);
        setNat({ w: el.offsetWidth, h: el.offsetHeight });
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (!autoFit) return;
        const fit = () => {
            if (!stageRef.current || !nat.w) return;
            const avail = stageRef.current.clientWidth;
            setZoom(Math.min(1, +(avail / nat.w).toFixed(3)));
        };
        fit();
        window.addEventListener('resize', fit);
        return () => window.removeEventListener('resize', fit);
    }, [autoFit, nat.w]);

    const zoomBy = useCallback((delta) => {
        setAutoFit(false);
        setZoom(prev => {
            const next = Math.min(2.5, Math.max(0.35, +(prev + delta).toFixed(2)));
            const stage = stageRef.current;
            if (stage && prev > 0 && next !== prev) {
                const ratio = next / prev;
                const cx = stage.scrollLeft + stage.clientWidth / 2;
                const cy = stage.scrollTop + stage.clientHeight / 2;
                requestAnimationFrame(() => {
                    stage.scrollLeft = cx * ratio - stage.clientWidth / 2;
                    stage.scrollTop = cy * ratio - stage.clientHeight / 2;
                });
            }
            return next;
        });
    }, []);
    const zoomIn = useCallback(() => zoomBy(0.15), [zoomBy]);
    const zoomOut = useCallback(() => zoomBy(-0.15), [zoomBy]);
    const zoomReset = useCallback(() => { setAutoFit(false); setZoom(1); }, []);
    const zoomFit = useCallback(() => setAutoFit(true), []);

    const handleReset = () => {
        if (window.confirm(t('tools.resetConfirm'))) {
            setF({});
            setStamp('');
            setItems([emptyRow(), emptyRow(), emptyRow()]);
            signRef.current?.clear();
        }
    };

    const handlePrint = async () => {
        const allowed = await guard('tool', 'packing');
        if (!allowed) return;
        if (user) {
            api('/api/account/documents', {
                method: 'POST',
                body: {
                    type: 'packing',
                    title: `Packing ${f.plNo || ''}`.trim(),
                    data: { ...f, items, stamp, signature: signRef.current?.toDataURL() || '' },
                },
            }).catch(() => {});
        }
        window.print();
    };

    const stepKeys = ['s1', 's2', 's3', 's4'];

    // Goods declaration columns — localised headers (packing.table.*).
    // align: l = left, c = centre. Widths chosen so the HS-code edge (24%) lines
    // up with the meta label divider and the description edge (60%) lines up with
    // the meta/totals right edge and the top grid divider. The product-code
    // column is widened (12%) to hold long codes.
    const cols = [
        { k: 'itemNo', label: 'packing.table.itemNo', w: '12%', align: 'c' },
        { k: 'hs', label: 'packing.table.hs', w: '12%', align: 'c' },
        { k: 'name', label: 'packing.table.name', w: '36%', align: 'l' },
        { k: 'qty', label: 'packing.table.qty', w: '12%', align: 'c' },
        { k: 'netKg', label: 'packing.table.netKg', w: '14%', align: 'c' },
        { k: 'grossKg', label: 'packing.table.grossKg', w: '14%', align: 'c' },
    ];
    const alignCls = (a) => (a === 'l' ? 'ta-l' : a === 'r' ? 'ta-r' : 'ta-c');

    // Document meta rows (label/value pairs, localised captions).
    const metaRows = [
        ['plNo', 'packing.form.plNo'],
        ['invNo', 'packing.form.invNo'],
        ['invDate', 'packing.form.invDate'],
        ['issueDate', 'packing.form.issueDate'],
    ];
    // Totals: pallets is user-entered; units/net/gross auto-sum from the rows.
    const computed = {
        totalUnits: fmt(sumQty),
        totalNet: fmt(sumNet),
        totalGross: fmt(sumGross),
    };
    const editable = new Set(['totalPallets']);
    const totalRows = [
        ['totalPallets', 'packing.form.totalPallets'],
        ['totalUnits', 'packing.form.totalUnits'],
        ['totalNet', 'packing.form.totalNet'],
        ['totalGross', 'packing.form.totalGross'],
    ];

    return (
        <div className="cmr-page">
            <div className="cmr-toolbar">
                <div className="cmr-tb-left">
                    <img
                        src="/src/ldm-calculator-logo.png"
                        alt="LDM"
                        onClick={() => navigate('/')}
                        style={{ width: 150, cursor: 'pointer' }}
                    />
                    <strong style={{ color: '#1e293b' }}>{t('tools.packingList')}</strong>
                </div>
                <div className="cmr-tb-actions">
                    <button className="ai-btn" onClick={() => navigate('/')} style={{ height: 42 }}>
                        <div className="ai-btn-inner" style={{ padding: '0 16px', fontSize: '0.9rem' }}>
                            <span aria-hidden="true">←</span>{t('tools.back')}
                        </div>
                    </button>
                    <button className="ai-btn" onClick={handleReset} style={{ height: 42 }}>
                        <div className="ai-btn-inner" style={{ padding: '0 16px', fontSize: '0.9rem' }}>
                            <span aria-hidden="true">🧼</span>{t('tools.reset')}
                        </div>
                    </button>
                    <button className="cmr-btn cmr-btn-primary" onClick={handlePrint}>{t('tools.print')}</button>
                </div>
            </div>

            <div className="cmr-zoom-controls" role="group" aria-label={t('tools.zoom')}>
                <button type="button" onClick={zoomIn} aria-label={t('tools.zoomIn')} title={t('tools.zoomIn')}>+</button>
                <span className="cmr-zoom-pct">{Math.round(zoom * 100)}%</span>
                <button type="button" onClick={zoomOut} aria-label={t('tools.zoomOut')} title={t('tools.zoomOut')}>−</button>
                <button type="button" className={autoFit ? 'is-active' : ''} onClick={zoomFit} aria-label={t('tools.zoomFit')} title={t('tools.zoomFit')}>⤢</button>
                <button type="button" onClick={zoomReset} aria-label={t('tools.zoomReset')} title={t('tools.zoomReset')}>1:1</button>
            </div>

            {!guideOpen && (
                <button
                    type="button"
                    className="cmr-guide-reopen"
                    onClick={() => setGuideOpen(true)}
                    aria-label={t('packing.guide.show')}
                    title={t('packing.guide.show')}
                >
                    <span className="cmr-guide-reopen-icon" aria-hidden="true">›</span>
                    <span className="cmr-guide-reopen-text">{t('packing.guide.title')}</span>
                </button>
            )}

            <div className={`cmr-main${guideOpen ? '' : ' guide-collapsed'}`}>
                <aside className="cmr-guide" aria-label={t('packing.guide.title')} aria-hidden={!guideOpen}>
                    <div className="cmr-guide-head">
                        <h2 className="cmr-guide-title">{t('packing.guide.title')}</h2>
                        <button
                            type="button"
                            className="cmr-guide-toggle"
                            onClick={() => setGuideOpen(false)}
                            aria-label={t('packing.guide.hide')}
                            title={t('packing.guide.hide')}
                        >‹</button>
                    </div>
                    <p className="cmr-guide-intro">{t('packing.guide.intro')}</p>
                    <ol className="cmr-guide-steps">
                        {stepKeys.map(sk => (
                            <li key={sk}>
                                <span className="cmr-guide-num">{t(`packing.guide.steps.${sk}.n`)}</span>
                                <div className="cmr-guide-text">
                                    <strong>{t(`packing.guide.steps.${sk}.title`)}</strong>
                                    <span>{t(`packing.guide.steps.${sk}.desc`)}</span>
                                </div>
                            </li>
                        ))}
                    </ol>
                    <p className="cmr-guide-tip">{t('packing.guide.tip')}</p>
                </aside>

                <div className="cmr-stage" ref={stageRef}>
                  <div className="cmr-zoomwrap" style={{ width: nat.w ? nat.w * zoom : '210mm', height: nat.h ? nat.h * zoom : 'auto' }}>
                    <div className="cmr-sheet inv-sheet" ref={sheetRef} style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
                      <div className="inv-frame pl-frame">
                        {/* ===== EDITABLE DOCUMENT TITLE (top-left, prints as typed) ===== */}
                        <div className="inv-title-row">
                            <input
                                className="inv-title-input"
                                value={f.title ?? t('packing.form.titleDefault')}
                                onChange={set('title')}
                                aria-label={t('packing.form.titleDefault')}
                            />
                            <span className="inv-title-pencil inv-screen-only" aria-hidden="true">✎</span>
                        </div>

                        {/* ===== TOP: sender (full width) + recipient | stamp/signature ===== */}
                        <div className="inv-top pl-top">
                            <div className="inv-box inv-info pl-sender">
                                <div className="inv-cap">{t('invoice.form.sender')}</div>
                                <textarea value={val('sender')} onChange={set('sender')} />
                            </div>
                            <div className="inv-box inv-info inv-cell-r2c1">
                                <div className="inv-cap">{t('invoice.form.recipient')}</div>
                                <textarea value={val('recipient')} onChange={set('recipient')} />
                            </div>
                            <div className="inv-box inv-cell-r2c2">
                                <div className="inv-cap">{t('invoice.form.stamp')}</div>
                                <div className="inv-stamp-body">
                                    <div className="inv-stamp-media">
                                        <ImageUpload
                                            value={stamp}
                                            onChange={setStamp}
                                            uploadLabel={t('invoice.form.uploadStamp')}
                                            removeLabel={t('invoice.form.removeImage')}
                                        />
                                    </div>
                                    <SignaturePad
                                        ref={signRef}
                                        hint={t('invoice.form.signHint')}
                                        clearLabel={t('invoice.form.clearSignature')}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ===== DOCUMENT META (left block) ===== */}
                        <div className="inv-meta">
                            {metaRows.map(([k, key]) => (
                                <div className="inv-row" key={k}>
                                    <div className="lbl">{t(key)}</div>
                                    <div className="val"><input value={val(k)} onChange={set(k)} /></div>
                                </div>
                            ))}
                        </div>

                        {/* ===== GOODS TABLE — repeater rows ===== */}
                        <div className="inv-table-wrap">
                            <table className="inv-table">
                                <thead>
                                    <tr>
                                        {cols.map(c => (
                                            <th key={c.k} style={{ width: c.w }}>{t(c.label)}</th>
                                        ))}
                                        <th className="inv-ctrl-col inv-screen-only" aria-hidden="true"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((it, i) => (
                                        <tr key={i}>
                                            {cols.map(c => (
                                                <td key={c.k} className={alignCls(c.align)}>
                                                    <input value={it[c.k] ?? ''} onChange={setItem(i, c.k)} />
                                                </td>
                                            ))}
                                            <td className="inv-ctrl-col inv-screen-only">
                                                <button
                                                    type="button"
                                                    className="inv-row-del"
                                                    onClick={() => removeRow(i)}
                                                    title={t('invoice.form.removeRow')}
                                                    aria-label={t('invoice.form.removeRow')}
                                                    disabled={items.length <= 1}
                                                >×</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {/* filler row absorbs the slack so the sheet still fills the A4 */}
                                    <tr className="inv-filler">
                                        {cols.map(c => <td key={c.k} className={alignCls(c.align)} />)}
                                        <td className="inv-ctrl-col inv-screen-only" />
                                    </tr>
                                </tbody>
                            </table>
                            <button type="button" className="inv-add-row inv-screen-only" onClick={addRow}>
                                + {t('invoice.form.addRow')}
                            </button>
                        </div>

                        {/* ===== TOTALS (left) + NOTES (fills the right gap) ===== */}
                        <div className="inv-bottom">
                        <div className="inv-totals">
                            {totalRows.map(([k, key]) => (
                                <div className="inv-row" key={k}>
                                    <div className="lbl">{t(key)}</div>
                                    <div className="val">
                                        {editable.has(k) ? (
                                            <input value={val(k)} onChange={set(k)} />
                                        ) : (
                                            <span className="inv-computed">{computed[k]}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className={`inv-notes${(f.notes || '').trim() ? '' : ' inv-notes-empty'}`}>
                            <div className="inv-cap">{t('invoice.form.notes')}</div>
                            <textarea
                                value={val('notes')}
                                onChange={set('notes')}
                                placeholder={t('invoice.form.notesPlaceholder')}
                            />
                        </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
        </div>
    );
};

export default PackingList;
