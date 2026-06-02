import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n/LanguageContext';
import usePageMeta from '../hooks/usePageMeta';
import { useUsage } from '../usage/UsageContext';
import { useAuth } from '../auth/AuthContext';
import { api } from '../utils/api';
import '../cmr.css';

/**
 * CMR — International Consignment Note.
 * Fillable reproduction of the standard CMR sheet. The numbered cells and
 * blue ink are kept; the field captions are localised so the form renders in
 * the language the user has selected. A side guide explains the workflow
 * (left column on desktop, below the sheet on mobile). "Print / PDF" uses the
 * browser's native print dialog so the printed sheet matches A4 1:1.
 */
const CmrDocument = () => {
    const navigate = useNavigate();
    const { t } = useT();
    const { guard } = useUsage();
    const { user } = useAuth();
    usePageMeta({
        title: 'CMR Note — Fillable International Consignment Note Template | LDMCalculator',
        description: 'Free fillable CMR (International Consignment Note) template. Fill in sender, consignee, carrier and goods details and print or save as PDF.',
        canonical: 'https://ldmcalculator.com/tools/cmr'
    });

    const [f, setF] = useState({
        no: 'NO 02030',
        place3: 'İSTANBUL / TÜRKİYE'
    });
    const set = (k) => (e) => setF(prev => ({ ...prev, [k]: e.target.value }));
    const val = (k) => f[k] ?? '';

    // ----- Zoom / fit-to-width (mobile-friendly viewing) -----
    const stageRef = useRef(null);
    const sheetRef = useRef(null);
    const [nat, setNat] = useState({ w: 0, h: 0 });   // unscaled sheet size (px)
    const [zoom, setZoom] = useState(1);
    const [autoFit, setAutoFit] = useState(true);     // follow viewport width until user zooms manually
    const [guideOpen, setGuideOpen] = useState(true); // collapsible left guide (slide in/out)

    // Measure the true (unscaled) sheet size; transforms don't affect offset*.
    useEffect(() => {
        const el = sheetRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(() => setNat({ w: el.offsetWidth, h: el.offsetHeight }));
        ro.observe(el);
        setNat({ w: el.offsetWidth, h: el.offsetHeight });
        return () => ro.disconnect();
    }, []);

    // While in auto-fit mode, scale the sheet down to fit the available width.
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

    // Zoom around the current viewport centre and keep that point in view by
    // re-anchoring the stage scroll position after the scale changes.
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

    // Reset asks for confirmation first so a full form isn't wiped by accident.
    const handleReset = () => {
        if (window.confirm(t('tools.resetConfirm'))) {
            setF({ no: 'NO 02030', place3: 'İSTANBUL / TÜRKİYE' });
        }
    };

    // Printing/saving a CMR counts as one tool use against the free-tier quota.
    const handlePrint = async () => {
        const allowed = await guard('tool', 'cmr');
        if (!allowed) return;
        // Logged-in users get the document saved to their panel for re-download.
        if (user) {
            api('/api/account/documents', {
                method: 'POST',
                body: { type: 'cmr', title: `CMR ${f.no || ''}`.trim(), data: f },
            }).catch(() => {});
        }
        window.print();
    };

    const ta = (k, rows = 3) => (
        <textarea className="cmr-textarea" rows={rows} value={val(k)} onChange={set(k)} />
    );

    // Localised label helper: numbered cells keep their universal number.
    const lbl = (num, key) => (
        <div className="cmr-label">{num != null && <span className="num">{num}</span>}{num != null ? ' ' : ''}{t(key)}</div>
    );

    // 6 empty goods rows
    const goodsRows = Array.from({ length: 6 });

    // Guide steps are stored as flat keys (cmr.guide.steps.s1.title …) so each
    // one is editable from the admin Site-Content panel and overridable per lang.
    const stepKeys = ['s1', 's2', 's3', 's4', 's5', 's6'];

    const payRows = [
        ['carriage', t('cmr.form.payCarriage')],
        ['deductions', t('cmr.form.payDeductions')],
        ['balance', t('cmr.form.payBalance')],
        ['supplem', t('cmr.form.paySupplem')],
        ['other', t('cmr.form.payOther')],
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
                    <strong style={{ color: '#e2e8f0' }}>{t('tools.cmr')}</strong>
                </div>
                <div className="cmr-tb-actions">
                    <button className="cmr-btn" onClick={() => navigate('/')}>
                        <span className="cmr-btn-icon" aria-hidden="true">←</span>{t('tools.back')}
                    </button>
                    <button className="cmr-btn" onClick={handleReset}>
                        <span className="cmr-btn-icon" aria-hidden="true">🧼</span>{t('tools.reset')}
                    </button>
                    <button className="cmr-btn cmr-btn-primary" onClick={handlePrint}>{t('tools.print')}</button>
                </div>
            </div>

            {/* Side zoom controls (fixed; hidden when printing) */}
            <div className="cmr-zoom-controls" role="group" aria-label={t('tools.zoom')}>
                <button type="button" onClick={zoomIn} aria-label={t('tools.zoomIn')} title={t('tools.zoomIn')}>+</button>
                <span className="cmr-zoom-pct">{Math.round(zoom * 100)}%</span>
                <button type="button" onClick={zoomOut} aria-label={t('tools.zoomOut')} title={t('tools.zoomOut')}>−</button>
                <button type="button" className={autoFit ? 'is-active' : ''} onClick={zoomFit} aria-label={t('tools.zoomFit')} title={t('tools.zoomFit')}>⤢</button>
                <button type="button" onClick={zoomReset} aria-label={t('tools.zoomReset')} title={t('tools.zoomReset')}>1:1</button>
            </div>

            {/* Reopen tab — shown only when the guide is collapsed (hidden in print) */}
            {!guideOpen && (
                <button
                    type="button"
                    className="cmr-guide-reopen"
                    onClick={() => setGuideOpen(true)}
                    aria-label={t('cmr.guide.show')}
                    title={t('cmr.guide.show')}
                >
                    <span className="cmr-guide-reopen-icon" aria-hidden="true">›</span>
                    <span className="cmr-guide-reopen-text">{t('cmr.guide.title')}</span>
                </button>
            )}

            {/* Desktop: guide on the left, sheet on the right. Mobile: sheet on top, guide below. */}
            <div className={`cmr-main${guideOpen ? '' : ' guide-collapsed'}`}>
                <aside className="cmr-guide" aria-label={t('cmr.guide.title')} aria-hidden={!guideOpen}>
                    <div className="cmr-guide-head">
                        <h2 className="cmr-guide-title">{t('cmr.guide.title')}</h2>
                        <button
                            type="button"
                            className="cmr-guide-toggle"
                            onClick={() => setGuideOpen(false)}
                            aria-label={t('cmr.guide.hide')}
                            title={t('cmr.guide.hide')}
                        >‹</button>
                    </div>
                    <p className="cmr-guide-intro">{t('cmr.guide.intro')}</p>
                    <ol className="cmr-guide-steps">
                        {stepKeys.map(sk => (
                            <li key={sk}>
                                <span className="cmr-guide-num">{t(`cmr.guide.steps.${sk}.n`)}</span>
                                <div className="cmr-guide-text">
                                    <strong>{t(`cmr.guide.steps.${sk}.title`)}</strong>
                                    <span>{t(`cmr.guide.steps.${sk}.desc`)}</span>
                                </div>
                            </li>
                        ))}
                    </ol>
                    <p className="cmr-guide-tip">{t('cmr.guide.tip')}</p>
                </aside>

                <div className="cmr-stage" ref={stageRef}>
                  <div className="cmr-zoomwrap" style={{ width: nat.w ? nat.w * zoom : '210mm', height: nat.h ? nat.h * zoom : 'auto' }}>
                    <div className="cmr-sheet" ref={sheetRef} style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
                    <div className="cmr-frame">
                        {/* ===== LEFT VERTICAL LEGEND STRIP ===== */}
                        <div className="cmr-vstrip">
                            <span>{t('cmr.form.vstripCarrier')}</span>
                            <span>19 – 21 - 22</span>
                            <span>1 – 15</span>
                            <span>{t('cmr.form.vstripSender')}</span>
                        </div>

                        {/* ===== BODY ===== */}
                        <div className="cmr-body">
                            {/* ===== TOP REGION ===== */}
                            <div className="cmr-row">
                                {/* LEFT COLUMN */}
                                <div className="cmr-col" style={{ flex: '0 0 47%' }}>
                                    <div className="cmr-cell" style={{ minHeight: 78 }}>
                                        {lbl('1', 'cmr.form.f1')}
                                        {ta('sender', 4)}
                                    </div>
                                    <div className="cmr-cell" style={{ minHeight: 78 }}>
                                        {lbl('2', 'cmr.form.f2')}
                                        {ta('consignee', 4)}
                                    </div>
                                    <div className="cmr-cell" style={{ minHeight: 52 }}>
                                        {lbl('3', 'cmr.form.f3')}
                                        {ta('place3', 2)}
                                    </div>
                                    <div className="cmr-cell" style={{ minHeight: 52 }}>
                                        {lbl('4', 'cmr.form.f4')}
                                        {ta('place4', 2)}
                                    </div>
                                    <div className="cmr-cell" style={{ minHeight: 60 }}>
                                        {lbl('5', 'cmr.form.f5')}
                                        {ta('documents', 3)}
                                    </div>
                                </div>

                                {/* RIGHT COLUMN */}
                                <div className="cmr-col" style={{ flex: '1 1 53%' }}>
                                    {/* Title + NO box */}
                                    <div className="cmr-row">
                                        <div className="cmr-cell" style={{ flex: '1 1 64%' }}>
                                            <div className="cmr-title">
                                                {t('cmr.form.title')}<br />
                                                CMR<br />
                                                {t('cmr.form.titleAlt')}
                                            </div>
                                            <div className="cmr-conv">{t('cmr.form.convention')}</div>
                                        </div>
                                        <div className="cmr-col" style={{ flex: '1 1 36%' }}>
                                            <div className="cmr-cell" style={{ minHeight: 16 }}>
                                                <div className="cmr-label">{t('cmr.form.carrierNo')}</div>
                                            </div>
                                            <div className="cmr-cell cmr-heavy" style={{ minHeight: 30 }}>
                                                <input className="cmr-input cmr-no-box" value={val('no')} onChange={set('no')} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="cmr-cell" style={{ minHeight: 80 }}>
                                        {lbl('16', 'cmr.form.f16')}
                                        {ta('carrier', 4)}
                                    </div>
                                    <div className="cmr-cell" style={{ minHeight: 60 }}>
                                        {lbl('17', 'cmr.form.f17')}
                                        {ta('succCarrier', 3)}
                                    </div>
                                    <div className="cmr-cell" style={{ minHeight: 74 }}>
                                        <div className="cmr-label"><span className="num">18</span> {t('cmr.form.f18')} &nbsp;&nbsp; <b>19 – 21 - 22</b></div>
                                        {ta('reservations', 2)}
                                        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                                            <div style={{ flex: 1 }}>
                                                <div className="cmr-label">{t('cmr.form.carnet')}</div>
                                                <input className="cmr-input" value={val('carnet')} onChange={set('carnet')} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div className="cmr-label">{t('cmr.form.plate')}</div>
                                                <input className="cmr-input" value={val('plate')} onChange={set('plate')} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ===== GOODS TABLE ===== */}
                            <div style={{ position: 'relative' }}>
                                <table className="cmr-goods">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '15%' }}><span className="num">6</span> {t('cmr.form.goods6')}</th>
                                            <th style={{ width: '11%' }}><span className="num">7</span> {t('cmr.form.goods7')}</th>
                                            <th style={{ width: '13%' }}><span className="num">8</span> {t('cmr.form.goods8')}</th>
                                            <th style={{ width: '24%' }}><span className="num">9</span> {t('cmr.form.goods9')}</th>
                                            <th style={{ width: '13%' }}><span className="num">10</span> {t('cmr.form.goods10')}</th>
                                            <th style={{ width: '12%' }}><span className="num">11</span> {t('cmr.form.goods11')}</th>
                                            <th style={{ width: '12%' }}><span className="num">12</span> {t('cmr.form.goods12')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {goodsRows.map((_, i) => (
                                            <tr key={i}>
                                                {['marks', 'packs', 'packing', 'nature', 'stat', 'gross', 'net'].map(c => (
                                                    <td key={c}>
                                                        <input className="cell-input" value={val(`g_${c}_${i}`)} onChange={set(`g_${c}_${i}`)} />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="cmr-watermark">CMR</div>
                            </div>

                            {/* ===== BOTTOM REGION ===== */}
                            <div className="cmr-row">
                                {/* LEFT */}
                                <div className="cmr-col" style={{ flex: '0 0 47%' }}>
                                    {/* ADR header */}
                                    <div className="cmr-row">
                                        <div className="cmr-cell" style={{ flex: 1 }}>
                                            <div className="cmr-label">{t('cmr.form.class')}</div>
                                            <input className="cmr-input" value={val('adrClass')} onChange={set('adrClass')} />
                                        </div>
                                        <div className="cmr-cell" style={{ flex: 1 }}>
                                            <div className="cmr-label">{t('cmr.form.number')}</div>
                                            <input className="cmr-input" value={val('adrNumber')} onChange={set('adrNumber')} />
                                        </div>
                                        <div className="cmr-cell" style={{ flex: 1 }}>
                                            <div className="cmr-label">{t('cmr.form.letter')}</div>
                                            <input className="cmr-input" value={val('adrLetter')} onChange={set('adrLetter')} />
                                        </div>
                                    </div>
                                    <div className="cmr-cell" style={{ minHeight: 70 }}>
                                        {lbl('13', 'cmr.form.f13')}
                                        <div className="cmr-conv">{t('cmr.form.demurrage')}</div>
                                        {ta('sendersInstr', 2)}
                                    </div>
                                    <div className="cmr-cell" style={{ minHeight: 48 }}>
                                        {lbl('14', 'cmr.form.f14')}
                                        <label className="cmr-check"><input type="checkbox" checked={!!f.franco} onChange={e => setF(p => ({ ...p, franco: e.target.checked }))} /> {t('cmr.form.franco')}</label>
                                        <label className="cmr-check"><input type="checkbox" checked={!!f.nonFranco} onChange={e => setF(p => ({ ...p, nonFranco: e.target.checked }))} /> {t('cmr.form.nonFranco')}</label>
                                    </div>
                                    <div className="cmr-cell" style={{ minHeight: 40 }}>
                                        {lbl('21', 'cmr.form.f21')}
                                        {ta('establishedIn', 1)}
                                    </div>
                                    <div className="cmr-cell cmr-heavy" style={{ minHeight: 48 }}>
                                        {lbl('15', 'cmr.form.f15')}
                                        {ta('reimbursement', 2)}
                                    </div>
                                </div>

                                {/* RIGHT */}
                                <div className="cmr-col" style={{ flex: '1 1 53%' }}>
                                    <div className="cmr-cell" style={{ minHeight: 64 }}>
                                        {lbl('19', 'cmr.form.f19')}
                                        <div className="cmr-conv">{t('cmr.form.demurrage')}</div>
                                        {ta('specialTerms', 1)}
                                    </div>
                                    {/* 20 payment table */}
                                    <div className="cmr-cell cmr-heavy" style={{ padding: 0 }}>
                                        <table className="cmr-pay">
                                            <thead>
                                                <tr>
                                                    <th style={{ textAlign: 'left', width: '40%' }}><span className="num">20</span> {t('cmr.form.payBy')}</th>
                                                    <th style={{ width: '20%' }}>{t('cmr.form.paySender')}</th>
                                                    <th style={{ width: '20%' }}>{t('cmr.form.payCurrency')}</th>
                                                    <th style={{ width: '20%' }}>{t('cmr.form.payConsignee')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {payRows.map(([k, label]) => (
                                                    <tr key={k}>
                                                        <td className="lbl">{label}</td>
                                                        <td><input className="pay-input" value={val(`pay_${k}_s`)} onChange={set(`pay_${k}_s`)} /></td>
                                                        <td><input className="pay-input" value={val(`pay_${k}_cur`)} onChange={set(`pay_${k}_cur`)} /></td>
                                                        <td><input className="pay-input" value={val(`pay_${k}_co`)} onChange={set(`pay_${k}_co`)} /></td>
                                                    </tr>
                                                ))}
                                                <tr>
                                                    <td className="lbl"><b>{t('cmr.form.payTotal')}</b></td>
                                                    <td><input className="pay-input" value={val('pay_total_s')} onChange={set('pay_total_s')} /></td>
                                                    <td><input className="pay-input" value={val('pay_total_cur')} onChange={set('pay_total_cur')} /></td>
                                                    <td><input className="pay-input" value={val('pay_total_co')} onChange={set('pay_total_co')} /></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* ===== SIGNATURES ===== */}
                            <div className="cmr-row">
                                <div className="cmr-cell cmr-sign" style={{ flex: 1 }}>
                                    <div className="cmr-label"><span className="num">22</span></div>
                                    <div className="cap">{t('cmr.form.f22')}</div>
                                </div>
                                <div className="cmr-cell cmr-sign" style={{ flex: 1 }}>
                                    <div className="cmr-label"><span className="num">23</span></div>
                                    <div className="cap">{t('cmr.form.f23')}</div>
                                </div>
                                <div className="cmr-cell cmr-sign" style={{ flex: 1 }}>
                                    <div className="cmr-label"><span className="num">24</span> {t('cmr.form.f24Good')}</div>
                                    <div className="cap">{t('cmr.form.f24')}</div>
                                </div>
                            </div>
                        </div>

                        {/* ===== RIGHT VERTICAL LEGEND STRIP ===== */}
                        <div className="cmr-vstrip right">
                            <span>{t('cmr.form.vstripDanger')}</span>
                        </div>
                    </div>
                    </div>
                  </div>
                </div>
            </div>
        </div>
    );
};

export default CmrDocument;
