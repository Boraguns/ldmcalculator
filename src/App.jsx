import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import ModelViewer from './components/ModelViewer';
import InputWizard from './components/InputWizard';
import { BinPacking3D } from './utils/binpacking';
import Home from './pages/Home';
import PlaceholderPage from './pages/PlaceholderPage';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import About from './pages/About';
import Contact from './pages/Contact';
import Advertise from './pages/Advertise';
import Admin from './pages/Admin';
import CmrDocument from './pages/CmrDocument';
import Invoice from './pages/Invoice';
import ToolPlaceholder from './pages/ToolPlaceholder';
import { useT } from './i18n/LanguageContext';
import { useSiteAsset } from './hooks/useSiteAssets';
import usePageMeta from './hooks/usePageMeta';
import { UsageProvider } from './usage/UsageContext';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';
import Pricing from './pages/Pricing';
import References from './pages/References';
import Account from './pages/Account';
import AcceptInvite from './pages/AcceptInvite';
import Kvkk from './pages/legal/Kvkk';
import ExplicitConsent from './pages/legal/ExplicitConsent';
import RefundPolicy from './pages/legal/RefundPolicy';

const MODE_META = {
    truck: {
        title: 'Truck Load Calculator — Plan Trailer & Container Loads in 3D | LDMCalculator',
        description: 'Free 3D truck loading calculator. Plan trailer and container loads, calculate LDM (loading meters), pallet placement, volume efficiency and axle weight balance.',
        canonical: 'https://ldmcalculator.com/truck'
    },
    train: {
        title: 'Train Wagon Load Calculator — Rail Cargo Planner in 3D | LDMCalculator',
        description: 'Plan rail freight loads in 3D. Calculate wagon capacity, pallet placement and weight distribution for train cargo with our free LDM calculator.',
        canonical: 'https://ldmcalculator.com/train'
    },
    plane: {
        title: 'Air Cargo ULD Calculator — Plane Load Planner in 3D | LDMCalculator',
        description: 'Free air cargo ULD load planner. Visualize pallet placement across multiple ULDs, calculate volume efficiency and weight balance for plane freight.',
        canonical: 'https://ldmcalculator.com/plane'
    },
    ship: {
        title: 'Sea Container Load Calculator — Ship Cargo Planner in 3D | LDMCalculator',
        description: 'Plan ocean freight container loads in 3D. Optimize pallet placement, volume utilization and weight distribution for 20ft and 40ft sea containers.',
        canonical: 'https://ldmcalculator.com/ship'
    }
};

const GeneralCalculator = ({ mode = 'truck' }) => {
    const { t } = useT();
    usePageMeta(MODE_META[mode] || MODE_META.truck);
    const viewerLogo = useSiteAsset('viewer_logo', '/src/ldm-calculator-beyaz-logo.png');
    const [specs, setSpecs] = useState(null);
    const [packedItems, setPackedItems] = useState([]);
    const [viewMode, setViewMode] = useState('iso');
    const [hoveredItem, setHoveredItem] = useState(null);
    const [showScreenshotModal, setShowScreenshotModal] = useState(false);
    const [companyName, setCompanyName] = useState('');
    const [lastInput, setLastInput] = useState(null); // {truck, products} for rebalance
    const [addStangaMode, setAddStangaMode] = useState(false);
    const [stangas, setStangas] = useState([]); // [{itemIndex}]
    const [addSpanzetMode, setAddSpanzetMode] = useState(false);
    const [spanzets, setSpanzets] = useState([]); // [{itemIndex}]
    const navigate = useNavigate();

    const isTrain = mode === 'train';
    const isPlane = mode === 'plane';
    const initialSpecs = isTrain
        ? { length: 1400, width: 280, height: 280 }
        : isPlane
            ? { length: 318, width: 244, height: 160 }
            : mode === 'ship'
                ? { length: 590, width: 235, height: 239 }
                : { length: 1360, width: 245, height: 270 };

    // Post-pack pipeline: enrich placedItems with name/color, attach axle balance
    // analytics. Extracted so it runs identically for both initial pack and
    // the user-triggered "balanced restack" flow.
    const finalizePackResult = (result, products, actualTruck) => {
        const fallback = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
        const productMeta = {};
        products.forEach(p => {
            productMeta[p.id] = {
                name: (p.name && p.name.trim()) || `#${p.id}`,
                color: (p.color && /^#[0-9a-fA-F]{6}$/.test(p.color))
                    ? p.color
                    : fallback[p.id % fallback.length]
            };
        });
        result.placedItems = result.placedItems.map(it => ({
            ...it,
            color: productMeta[it.id]?.color,
            name: productMeta[it.id]?.name
        }));
        if (result.itemBreakdown) {
            Object.keys(result.itemBreakdown).forEach(id => {
                const meta = productMeta[id];
                if (meta) {
                    result.itemBreakdown[id].name = meta.name;
                    result.itemBreakdown[id].color = meta.color;
                }
            });
        }

        // Realistic axle balance for a semi-trailer: split the deck at its
        // midpoint and compare front-half vs rear-half weight, and compute the
        // longitudinal centre of gravity (CoG) as a % of trailer length
        // (0 = headboard/front, 100 = rear doors).
        //
        // A safe load is centred or biased slightly FORWARD (toward the kingpin
        // and tractor drive axles). A REAR-biased load is the dangerous/illegal
        // case (overloads the trailer axles, lightens the drive axles), so the
        // warning + "rebalance" action only fire when the CoG drifts behind the
        // safe zone. A partially-loaded truck packed solid from the front is
        // front-biased and perfectly normal — it must NOT warn.
        const L = actualTruck.length;
        let frontW = 0, restW = 0, cogNum = 0;
        result.placedItems.forEach(it => {
            const cx = (it.position?.x || 0) + (it.dimensions?.length || 0) / 2;
            const w = (it.weight || 0) * (it.quantity || 1);
            if (cx < L / 2) frontW += w; else restW += w;
            cogNum += w * cx;
        });
        const totalDistW = frontW + restW;
        if (totalDistW > 0) {
            const frontPct = (frontW / totalDistW) * 100;
            const cogPct = (cogNum / totalDistW / L) * 100;
            result.balance = {
                front: frontW,
                rear: restW,
                frontPct,
                rearPct: 100 - frontPct,
                cogPct,
                targetFrontPct: 50,
                // Only flag genuinely rear-biased loads (CoG behind ~58% of the
                // deck). Front bias is safe and is left unflagged.
                warning: cogPct > 58
            };
        }
        return result;
    };

    const handleRebalance = () => {
        if (!lastInput) return null;
        const { truck, products } = lastInput;
        try {
            const packer = new BinPacking3D(truck, products);
            const result = packer.pack();
            if (!result.success) return null;
            const rb = packer.rebalance();
            // Reflect the swapped positions back into the result object.
            result.placedItems = packer.placedItems;
            result.rebalanceInfo = rb;
            const requestedTotal = products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);
            if (result.totalItems < requestedTotal) {
                result.isOverloaded = true;
                result.missingCount = requestedTotal - result.totalItems;
            }
            const finalized = finalizePackResult(result, products, truck);
            setPackedItems(finalized.placedItems);
            return finalized;
        } catch (e) {
            console.error('Rebalance error:', e);
            return null;
        }
    };

    const handleCalculate = (truck, products) => {
        let actualTruck = { ...truck };

        // For Plane mode, if cargo is longer than 3.18m, it spans multiple ULDs
        if (isPlane) {
            const maxProdLen = Math.max(...products.map(p => parseFloat(p.length) || 0));
            if (maxProdLen > actualTruck.length) {
                // Use a virtual long bin to determine total ULD spans
                const uldBase = 318;
                actualTruck.length = Math.ceil(maxProdLen / uldBase) * uldBase;
            }
        }

        setSpecs(actualTruck);
        try {
            const packer = new BinPacking3D(actualTruck, products);
            const result = packer.pack();

            if (result.success) {
                const requestedTotal = products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);

                // Add Plane specific metrics
                if (isPlane) {
                    const uldBase = 318;
                    const maxPos = result.placedItems.reduce((max, item) => Math.max(max, item.position.x + item.dimensions.length), 0);
                    result.uldCount = Math.ceil(maxPos / uldBase) || 1;
                }

                if (result.totalItems < requestedTotal) {
                    result.isOverloaded = true;
                    result.missingCount = requestedTotal - result.totalItems;
                }
                const finalized = finalizePackResult(result, products, actualTruck);
                setLastInput({ truck: actualTruck, products });
                setPackedItems(finalized.placedItems);
                setStangas([]); // reset manual ştangas on new pack
                setSpanzets([]);
                setAddStangaMode(false);
                setAddSpanzetMode(false);
                return finalized;
            } else {
                alert(t('wizard.notFitErr'));
                setPackedItems([]);
                return null;
            }
        } catch (error) {
            console.error("Error:", error);
            alert(t('wizard.errorOccurred'));
        }
        return null;
    };

    // Find the topmost item in the same column as packedItems[i] (same x,y footprint).
    const topmostInColumn = (items, i) => {
        const it = items[i];
        if (!it) return i;
        let bestIdx = i;
        let bestZ = it.position.z;
        for (let k = 0; k < items.length; k++) {
            const p = items[k];
            if (p.position.x === it.position.x &&
                p.position.y === it.position.y &&
                p.dimensions.length === it.dimensions.length &&
                p.dimensions.width === it.dimensions.width &&
                p.position.z > bestZ) {
                bestZ = p.position.z;
                bestIdx = k;
            }
        }
        return bestIdx;
    };

    const handleHover = (item, x, y) => {
        if (item) {
            setHoveredItem({ item, x, y });
        } else {
            setHoveredItem(null);
        }
    };

    const handleDownload = () => {
        const canvas = document.getElementById('truck-canvas');
        if (!canvas) return;
        const actualCanvas = canvas.querySelector('canvas') || canvas;

        const logo = new Image();
        logo.crossOrigin = "anonymous";
        logo.src = viewerLogo;

        const finalizeDownload = (withLogo = false) => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = actualCanvas.width;
            tempCanvas.height = actualCanvas.height;
            const ctx = tempCanvas.getContext('2d');

            // Fill background
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

            // Draw the 3D scene
            ctx.drawImage(actualCanvas, 0, 0);

            // ===== Legend overlay (top-left) =====
            // Mirrors the on-screen "Loaded products" legend so the screenshot
            // is self-explanatory: name + colored swatch + count per product.
            if (legendItems.length > 0) {
                const padX = 24;
                const padY = 24;
                const lineH = 26;
                const sw = 16; // swatch
                const titleH = 28;
                const itemFont = '500 15px Inter, system-ui, sans-serif';
                const titleFont = '600 17px Inter, system-ui, sans-serif';
                ctx.font = itemFont;
                let widest = 0;
                legendItems.forEach(l => {
                    const label = `${l.name && !String(l.name).startsWith('#') ? l.name : '#' + l.id} — ${l.count} ${t('viewer.qty')}`;
                    const w = ctx.measureText(label).width;
                    if (w > widest) widest = w;
                });
                ctx.font = titleFont;
                const title = t('viewer.loadedProducts');
                const tw = ctx.measureText(title).width;
                const boxW = Math.max(tw, widest + sw + 12) + 28;
                const boxH = titleH + lineH * legendItems.length + 14;

                // Backplate
                ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
                ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                ctx.lineWidth = 1;
                const x0 = padX, y0 = padY;
                const r = 10;
                ctx.beginPath();
                ctx.moveTo(x0 + r, y0);
                ctx.lineTo(x0 + boxW - r, y0);
                ctx.quadraticCurveTo(x0 + boxW, y0, x0 + boxW, y0 + r);
                ctx.lineTo(x0 + boxW, y0 + boxH - r);
                ctx.quadraticCurveTo(x0 + boxW, y0 + boxH, x0 + boxW - r, y0 + boxH);
                ctx.lineTo(x0 + r, y0 + boxH);
                ctx.quadraticCurveTo(x0, y0 + boxH, x0, y0 + boxH - r);
                ctx.lineTo(x0, y0 + r);
                ctx.quadraticCurveTo(x0, y0, x0 + r, y0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Title
                ctx.fillStyle = '#fff';
                ctx.font = titleFont;
                ctx.textAlign = 'left';
                ctx.fillText(title, x0 + 14, y0 + 22);

                // Items
                ctx.font = itemFont;
                legendItems.forEach((l, i) => {
                    const cy = y0 + titleH + 6 + i * lineH;
                    // Swatch
                    ctx.fillStyle = l.color || colors[l.colorId % colors.length];
                    ctx.fillRect(x0 + 14, cy, sw, sw);
                    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
                    ctx.strokeRect(x0 + 14, cy, sw, sw);
                    // Label
                    ctx.fillStyle = '#fff';
                    const label = `${l.name && !String(l.name).startsWith('#') ? l.name : '#' + l.id} — ${l.count} ${t('viewer.qty')}`;
                    ctx.fillText(label, x0 + 14 + sw + 10, cy + 13);
                });
            }

            if (withLogo) {
                const padding = 30;
                const logoWidth = 180;
                const logoHeight = (logo.height / logo.width) * logoWidth;

                // Draw "downloaded" text
                ctx.font = '500 14px Inter, system-ui, sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.textAlign = 'right';

                const logoX = tempCanvas.width - padding - logoWidth;
                const logoY = tempCanvas.height - padding - logoHeight;
                const textY = logoY - 10;

                ctx.fillText('downloaded', tempCanvas.width - padding, textY);
                ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
            }

            const link = document.createElement('a');
            const timestamp = new Date().getTime();
            const safeName = companyName ? companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'adsiz';
            link.download = `${safeName}-${mode}-loading-${timestamp}.png`;
            link.href = tempCanvas.toDataURL('image/png');
            link.click();

            // Fire-and-forget log to admin panel. Failures are silent so a
            // network hiccup never blocks the screenshot download.
            try {
                fetch('/api/screenshot-log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        company_name: companyName || '',
                        plate: '',
                        driver: '',
                        note: '',
                        truck_type: specs?.label || mode,
                        payload: {
                            mode,
                            total_items: packedItems.length,
                            total_weight: packedItems.reduce((s, it) => s + (it.weight || 0), 0),
                            legend: legendItems.map(l => ({ id: l.id, name: l.name, count: l.count, color: l.color })),
                            specs
                        }
                    })
                }).catch(() => {});
            } catch (_) { /* noop */ }

            setShowScreenshotModal(false);
            setCompanyName(''); // Reset for next time
        };

        logo.onload = () => finalizeDownload(true);
        logo.onerror = () => finalizeDownload(false);
    };

    const handleFullReset = () => {
        setSpecs(null);
        setPackedItems([]);
        setHoveredItem(null);
    };

    const handleClearPacked = () => {
        setPackedItems([]);
        setHoveredItem(null);
    };

    const legendItems = Object.values(
        packedItems.reduce((acc, item) => {
            if (!acc[item.id]) acc[item.id] = { id: item.id, count: 0, colorId: item.id, color: item.color, name: item.name };
            acc[item.id].count++;
            return acc;
        }, {})
    );

    const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

    return (
        <div className="container" style={{ height: '100vh', width: '100vw', background: '#0f172a', display: 'flex', overflow: 'hidden' }}>
            {/* LEFT: VISUAL SECTION */}
            <div className={`${mode}-section`} style={{
                flex: 2,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <img
                    src={viewerLogo}
                    alt="LDM Logo"
                    onClick={() => navigate('/')}
                    style={{
                        position: 'absolute',
                        top: '2rem',
                        left: '2rem',
                        width: '180px',
                        zIndex: 1000,
                        cursor: 'pointer'
                    }}
                />
                <div style={{ flex: 1, position: 'relative', width: '100%' }}>
                    <ModelViewer
                        truckType={specs || initialSpecs}
                        packedItems={packedItems}
                        viewMode={viewMode}
                        onHoverItem={handleHover}
                        onUserInteraction={() => setViewMode(null)}
                        mode={mode}
                        addStangaMode={addStangaMode}
                        stangas={stangas}
                        onAddStanga={(idx) => {
                            // Find the topmost item in this column so the bar
                            // attaches at the top of the stack, not in between.
                            const topIdx = topmostInColumn(packedItems, idx);
                            setStangas(prev => {
                                const exists = prev.findIndex(s => s.itemIndex === topIdx);
                                if (exists >= 0) return prev.filter((_, i) => i !== exists);
                                return [...prev, { itemIndex: topIdx }];
                            });
                        }}
                        onRemoveStanga={(si) => setStangas(prev => prev.filter((_, i) => i !== si))}
                        addSpanzetMode={addSpanzetMode}
                        spanzets={spanzets}
                        onAddSpanzet={(idx) => {
                            const topIdx = topmostInColumn(packedItems, idx);
                            setSpanzets(prev => {
                                const exists = prev.findIndex(s => s.itemIndex === topIdx);
                                if (exists >= 0) return prev.filter((_, i) => i !== exists);
                                return [...prev, { itemIndex: topIdx }];
                            });
                        }}
                        onRemoveSpanzet={(si) => setSpanzets(prev => prev.filter((_, i) => i !== si))}
                    />

                    {/* SCREENSHOT BUTTON */}
                    {packedItems.length > 0 && (
                        <button
                            className="ai-btn"
                            onClick={() => setShowScreenshotModal(true)}
                            style={{
                                position: 'absolute',
                                top: '20px',
                                right: '20px',
                                zIndex: 100,
                                padding: '2px',
                                height: '40px',
                                width: 'auto'
                            }}
                        >
                            <div className="ai-btn-inner" style={{ padding: '0 16px', height: '100%', gap: '8px', fontSize: '0.85rem' }}>
                                📸 {t('viewer.screenshot')}
                            </div>
                        </button>
                    )}

                    {/* VIEW CONTROLS */}
                    <div className="view-controls" style={{
                        position: 'absolute',
                        bottom: '25px',
                        right: '25px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        zIndex: 1000,
                        pointerEvents: 'auto'
                    }}>
                        {[
                            { id: 'iso', label: t('viewer.iso') },
                            { id: 'top', label: t('viewer.top') },
                            { id: 'side', label: t('viewer.side') },
                            { id: 'front', label: t('viewer.front') },
                            { id: 'back', label: t('viewer.back') }
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                className={`ai-btn ${viewMode === btn.id ? 'ai-btn-primary' : ''}`}
                                onClick={() => setViewMode(btn.id)}
                                style={{ height: '36px', padding: '2px', pointerEvents: 'auto' }}
                            >
                                <div className="ai-btn-inner" style={{
                                    padding: '0 12px',
                                    height: '100%',
                                    fontSize: '0.75rem',
                                    background: viewMode === btn.id ? '#3b82f6' : '#1a1a1a',
                                    color: 'white',
                                    minWidth: '95px',
                                    justifyContent: 'center',
                                    pointerEvents: 'none'
                                }}>
                                    {btn.label}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* LEGEND overlay */}
                    {packedItems.length > 0 && (
                        <div style={{
                            position: 'absolute',
                            top: '70px',
                            left: '20px',
                            background: 'rgba(0, 0, 0, 0.7)',
                            padding: '10px',
                            borderRadius: '8px',
                            backdropFilter: 'blur(4px)',
                            zIndex: 10
                        }}>
                            <h4 style={{ margin: '0 0 8px 0', color: 'white', fontSize: '0.9rem' }}>{t('viewer.loadedProducts')}</h4>
                            {legendItems.map(l => (
                                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: 'white', fontSize: '0.8rem' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: l.color || colors[l.colorId % colors.length] }}></div>
                                    <span>{l.name && !l.name.startsWith('#') ? l.name : `#${l.id}`} - {l.count} {t('viewer.qty')}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* TOOLTIP */}
                    {hoveredItem && (
                        <div style={{
                            position: 'fixed',
                            left: hoveredItem.x + 15,
                            top: hoveredItem.y - 15,
                            background: 'rgba(255, 255, 255, 0.95)',
                            color: '#333',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                            pointerEvents: 'none',
                            zIndex: 100,
                            fontSize: '0.85rem',
                            fontWeight: '500'
                        }}>
                            {hoveredItem.item.__stanga ? (
                                <div style={{ fontWeight: 600 }}>🔧 Ştanga</div>
                            ) : hoveredItem.item.__spanzet ? (
                                <div style={{ fontWeight: 600 }}>🪢 Spanzet</div>
                            ) : (
                                <>
                                    <div>{hoveredItem.item.name && !String(hoveredItem.item.name).startsWith('#') ? hoveredItem.item.name : `${t('viewer.product')} #${hoveredItem.item.id}`}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#666' }}>
                                        {hoveredItem.item.dimensions.length}x{hoveredItem.item.dimensions.width}x{hoveredItem.item.dimensions.height}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: WIZARD */}
            <InputWizard
                onCalculate={handleCalculate}
                onRebalance={handleRebalance}
                onFullReset={handleFullReset}
                onClearPacked={handleClearPacked}
                mode={mode}
                addStangaMode={addStangaMode}
                onToggleStangaMode={() => { setAddStangaMode(v => !v); setAddSpanzetMode(false); }}
                stangaCount={stangas.length}
                addSpanzetMode={addSpanzetMode}
                onToggleSpanzetMode={() => { setAddSpanzetMode(v => !v); setAddStangaMode(false); }}
                spanzetCount={spanzets.length}
            />

            {/* SCREENSHOT MODAL */}
            {showScreenshotModal && (
                <div className="modal-overlay" onClick={() => setShowScreenshotModal(false)}>
                    <div className="ldm-modal" onClick={e => e.stopPropagation()}>
                        <h2 style={{ color: 'white', marginBottom: '20px', textAlign: 'center' }}>{t('viewer.saveScreenshot')}</h2>

                        <div className="ai-input-group" style={{ marginBottom: '25px' }}>
                            <label className="ai-input-label">{t('viewer.companyName')}</label>
                            <div className="ai-input-container">
                                <div className="ai-input-inner">
                                    <input
                                        type="text"
                                        placeholder={t('viewer.companyPlaceholder')}
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="ai-btn" onClick={() => setShowScreenshotModal(false)} style={{ flex: 1, height: '44px' }}>
                                <div className="ai-btn-inner">{t('viewer.cancel')}</div>
                            </button>
                            <button
                                className="ai-btn ai-btn-primary"
                                onClick={handleDownload}
                                style={{ flex: 2, height: '44px' }}
                            >
                                <div className="ai-btn-inner" style={{ background: '#3b82f6', color: 'white' }}>
                                    {t('viewer.download')}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

function App() {
    return (
        <Router>
            <UsageProvider>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/truck" element={<GeneralCalculator mode="truck" />} />
                    <Route path="/train" element={<GeneralCalculator mode="train" />} />
                    <Route path="/plane" element={<GeneralCalculator mode="plane" />} />
                    <Route path="/ship" element={<GeneralCalculator mode="ship" />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/advertise" element={<Advertise />} />
                    <Route path="/tools/cmr" element={<CmrDocument />} />
                    <Route path="/tools/invoice" element={<Invoice />} />
                    <Route path="/tools/packing-list" element={<ToolPlaceholder titleKey="tools.packingList" />} />
                    {/* Auth + account */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/accept-invite" element={<AcceptInvite />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/references" element={<References />} />
                    <Route path="/account" element={<Account />} />
                    <Route path="/account/:tab" element={<Account />} />
                    {/* Legal */}
                    <Route path="/legal/kvkk" element={<Kvkk />} />
                    <Route path="/legal/explicit-consent" element={<ExplicitConsent />} />
                    <Route path="/legal/refund-policy" element={<RefundPolicy />} />
                    <Route path="/admin" element={<Admin />} />
                </Routes>
            </UsageProvider>
        </Router>
    );
}

export default App;
