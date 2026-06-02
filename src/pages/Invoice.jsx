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
 * Hand-drawn signature pad.
 * Kept as a module-level component (not inline) with an imperative
 * handle so the parent's keystroke re-renders never remount the canvas
 * and wipe the ink. The backing store is sized from offsetWidth/Height
 * (transform-independent), and pointer coords are mapped through the
 * canvas/rect ratio so drawing stays accurate at any zoom level.
 * ------------------------------------------------------------------ */
const SignaturePad = forwardRef(({ hint, clearLabel }, ref) => {
    const canvasRef = useRef(null);
    const drawing = useRef(false);
    const [hasInk, setHasInk] = useState(false);

    const getCtx = () => (canvasRef.current ? canvasRef.current.getContext('2d') : null);

    // Size the backing store to the laid-out box and prime the stroke style.
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

    // Map a pointer event to backing-store coordinates (compensates for zoom).
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
SignaturePad.displayName = 'SignaturePad';

/* ------------------------------------------------------------------ *
 * Image upload box (logo / stamp) — dataURL kept in parent state.
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
 * Invoice (Fatura) — fillable export-invoice template.
 * Mirrors invoice.pdf: a 2×2 header (sender / logo, recipient / stamp+signature),
 * invoice meta rows, a blue-header goods table with a Russian declaration that
 * grows to fill the A4 sheet, and a totals block. Logo and stamp are uploadable,
 * the signature is hand-drawn. "Print / PDF" prints the sheet 1:1 on A4.
 */
const Invoice = () => {
    const navigate = useNavigate();
    const { t } = useT();
    const { guard } = useUsage();
    const { user } = useAuth();
    usePageMeta({
        title: 'Export Invoice — Fillable Commercial Invoice Template | LDMCalculator',
        description: 'Free fillable export/commercial invoice template with a Russian goods declaration. Upload your logo and stamp, sign by hand, then print or save as PDF.',
        canonical: 'https://ldmcalculator.com/tools/invoice',
    });

    const [f, setF] = useState({});
    const [logo, setLogo] = useState('');
    const [stamp, setStamp] = useState('');
    const [currency, setCurrency] = useState('EUR');
    const emptyRow = () => ({ hs: '', name: '', qty: '', price: '' });
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

    // ----- currency + numeric helpers -----
    const CURRENCIES = [
        { code: 'EUR', sym: '€' },
        { code: 'USD', sym: '$' },
        { code: 'TRY', sym: '₺' },
        { code: 'RUB', sym: '₽' },
        { code: 'GBP', sym: '£' },
        { code: 'CNY', sym: '¥' },
        { code: 'AED', sym: 'د.إ' },
    ];
    const sym = CURRENCIES.find(c => c.code === currency)?.sym || '';
    const num = (s) => { const n = parseFloat(String(s ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
    const money = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const lineTotal = (it) => num(it.qty) * num(it.price);

    // ----- totals derived from the line items + the editable fields -----
    const sumQty = items.reduce((s, it) => s + num(it.qty), 0);
    const subtotal = items.reduce((s, it) => s + lineTotal(it), 0);
    const discountAmt = num(f.discount);
    const taxableBase = Math.max(0, subtotal - discountAmt);
    const vatRate = num(f.vat);
    const vatAmount = taxableBase * vatRate / 100;
    const grandTotal = taxableBase + vatAmount;

    // ----- Zoom / fit-to-width (shared shell with CMR) -----
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
            setLogo('');
            setStamp('');
            setItems([emptyRow(), emptyRow(), emptyRow()]);
            signRef.current?.clear();
        }
    };

    const handlePrint = async () => {
        const allowed = await guard('tool', 'invoice');
        if (!allowed) return;
        if (user) {
            api('/api/account/documents', {
                method: 'POST',
                body: {
                    type: 'invoice',
                    title: `Invoice ${f.docNo || ''}`.trim(),
                    data: { ...f, currency, items, logo, stamp, signature: signRef.current?.toDataURL() || '' },
                },
            }).catch(() => {});
        }
        window.print();
    };

    const stepKeys = ['s1', 's2', 's3', 's4', 's5'];

    // Goods declaration columns — headers are localised (invoice.table.*).
    // align: l = left, c = centre; money: append the active currency symbol;
    // type: 'in' = editable input, 'calc' = auto-computed line total.
    const cols = [
        { k: 'hs', label: 'invoice.table.hs', w: '16%', align: 'c', type: 'in' },
        { k: 'name', label: 'invoice.table.name', w: '44%', align: 'l', type: 'in' },
        { k: 'qty', label: 'invoice.table.qty', w: '10%', align: 'c', type: 'in' },
        { k: 'price', label: 'invoice.table.price', w: '15%', align: 'c', type: 'in', money: true },
        { k: 'total', label: 'invoice.table.total', w: '15%', align: 'c', type: 'calc', money: true },
    ];
    const alignCls = (a) => (a === 'l' ? 'ta-l' : a === 'r' ? 'ta-r' : 'ta-c');

    // Invoice meta rows (label/value pairs, localised captions).
    const metaRows = [
        ['invType', 'invoice.form.invType'],
        ['docNo', 'invoice.form.docNo'],
        ['invDate', 'invoice.form.invDate'],
        ['issueDate', 'invoice.form.issueDate'],
    ];
    // Totals rows. editable → user input; otherwise auto-computed from the
    // line items (money rows are prefixed with the active currency symbol).
    const computed = {
        totalQty: { val: sumQty % 1 === 0 ? String(sumQty) : money(sumQty) },
        totalGoods: { val: money(subtotal), money: true },
        taxable: { val: money(taxableBase), money: true },
        vatIncl: { val: money(vatAmount), money: true },
        totalAmount: { val: money(grandTotal), money: true },
    };
    const editable = new Set(['discount', 'vat', 'rate']);
    const totalRows = [
        ['totalQty', 'invoice.form.totalQty'],
        ['totalGoods', 'invoice.form.totalGoods'],
        ['discount', 'invoice.form.discount'],
        ['taxable', 'invoice.form.taxable'],
        ['vat', 'invoice.form.vat'],
        ['vatIncl', 'invoice.form.vatIncl'],
        ['rate', 'invoice.form.rate'],
        ['totalAmount', 'invoice.form.totalAmount'],
    ];

    return (
        <div className="cmr-page">
            <div className="cmr-toolbar">
                <div className="cmr-tb-left">
                    <img
                        src="/src/ldm-calculator-beyaz-logo.png"
                        alt="LDM"
                        onClick={() => navigate('/')}
                        style={{ width: 150, cursor: 'pointer' }}
                    />
                    <strong style={{ color: '#e2e8f0' }}>{t('tools.invoice')}</strong>
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

            {/* Currency selector — screen-only, never printed. */}
            <div className="inv-currency-bar inv-screen-only">
                <span className="inv-currency-label">{t('invoice.form.currency')}</span>
                {CURRENCIES.map(c => (
                    <button
                        type="button"
                        key={c.code}
                        className={`inv-currency-opt${currency === c.code ? ' is-active' : ''}`}
                        onClick={() => setCurrency(c.code)}
                    >
                        <span className="inv-currency-sym">{c.sym}</span>{c.code}
                    </button>
                ))}
            </div>

            {!guideOpen && (
                <button
                    type="button"
                    className="cmr-guide-reopen"
                    onClick={() => setGuideOpen(true)}
                    aria-label={t('invoice.guide.show')}
                    title={t('invoice.guide.show')}
                >
                    <span className="cmr-guide-reopen-icon" aria-hidden="true">›</span>
                    <span className="cmr-guide-reopen-text">{t('invoice.guide.title')}</span>
                </button>
            )}

            <div className={`cmr-main${guideOpen ? '' : ' guide-collapsed'}`}>
                <aside className="cmr-guide" aria-label={t('invoice.guide.title')} aria-hidden={!guideOpen}>
                    <div className="cmr-guide-head">
                        <h2 className="cmr-guide-title">{t('invoice.guide.title')}</h2>
                        <button
                            type="button"
                            className="cmr-guide-toggle"
                            onClick={() => setGuideOpen(false)}
                            aria-label={t('invoice.guide.hide')}
                            title={t('invoice.guide.hide')}
                        >‹</button>
                    </div>
                    <p className="cmr-guide-intro">{t('invoice.guide.intro')}</p>
                    <ol className="cmr-guide-steps">
                        {stepKeys.map(sk => (
                            <li key={sk}>
                                <span className="cmr-guide-num">{t(`invoice.guide.steps.${sk}.n`)}</span>
                                <div className="cmr-guide-text">
                                    <strong>{t(`invoice.guide.steps.${sk}.title`)}</strong>
                                    <span>{t(`invoice.guide.steps.${sk}.desc`)}</span>
                                </div>
                            </li>
                        ))}
                    </ol>
                    <p className="cmr-guide-tip">{t('invoice.guide.tip')}</p>
                </aside>

                <div className="cmr-stage" ref={stageRef}>
                  <div className="cmr-zoomwrap" style={{ width: nat.w ? nat.w * zoom : '210mm', height: nat.h ? nat.h * zoom : 'auto' }}>
                    <div className="cmr-sheet inv-sheet" ref={sheetRef} style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
                      <div className="inv-frame">
                        {/* ===== TOP 2×2 GRID (flat children so grid rows align) ===== */}
                        <div className="inv-top">
                            {/* row 1: sender | logo */}
                            <div className="inv-box inv-info inv-cell-r1c1">
                                <div className="inv-cap">{t('invoice.form.sender')}</div>
                                <textarea value={val('sender')} onChange={set('sender')} />
                            </div>
                            <div className="inv-box inv-cell-r1c2">
                                <div className="inv-cap">{t('invoice.form.logo')}</div>
                                <ImageUpload
                                    value={logo}
                                    onChange={setLogo}
                                    uploadLabel={t('invoice.form.uploadLogo')}
                                    removeLabel={t('invoice.form.removeImage')}
                                />
                            </div>
                            {/* row 2: recipient | stamp+signature (tops aligned by the grid) */}
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

                        {/* ===== INVOICE META (left half) ===== */}
                        <div className="inv-meta">
                            {metaRows.map(([k, key]) => (
                                <div className="inv-row" key={k}>
                                    <div className="lbl">{t(key)}</div>
                                    <div className="val"><input value={val(k)} onChange={set(k)} /></div>
                                </div>
                            ))}
                        </div>

                        {/* ===== GOODS TABLE — repeater rows, auto line totals ===== */}
                        <div className="inv-table-wrap">
                            <table className="inv-table">
                                <thead>
                                    <tr>
                                        {cols.map(c => (
                                            <th key={c.k} style={{ width: c.w }}>
                                                {t(c.label)}{c.money ? ` (${sym})` : ''}
                                            </th>
                                        ))}
                                        <th className="inv-ctrl-col inv-screen-only" aria-hidden="true"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((it, i) => (
                                        <tr key={i}>
                                            {cols.map(c => (
                                                <td key={c.k} className={alignCls(c.align)}>
                                                    {c.type === 'in' ? (
                                                        <input value={it[c.k] ?? ''} onChange={setItem(i, c.k)} />
                                                    ) : (
                                                        <span className="inv-calc">{lineTotal(it) ? money(lineTotal(it)) : ''}</span>
                                                    )}
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

                        {/* ===== TOTALS (auto-computed from the line items) ===== */}
                        <div className="inv-totals">
                            {totalRows.map(([k, key]) => {
                                const c = computed[k];
                                return (
                                    <div className="inv-row" key={k}>
                                        <div className="lbl">{t(key)}</div>
                                        <div className="val">
                                            {editable.has(k) ? (
                                                <input value={val(k)} onChange={set(k)} />
                                            ) : (
                                                <span className="inv-computed">
                                                    {c?.money ? `${sym} ${c.val}` : (c?.val ?? '')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
        </div>
    );
};

export default Invoice;
