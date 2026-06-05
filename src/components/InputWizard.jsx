import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../checkbox.css';
import '../input-style.css';
import StepLoader from './StepLoader';
import { useT, LanguageSwitcher } from '../i18n/LanguageContext';
import AccountMenu from './AccountMenu';
import { downloadProductTemplate, parseProductsFile } from '../utils/excelProducts';
import { useUsage } from '../usage/UsageContext';

const InputWizard = ({ onCalculate, onRebalance, onFullReset, onClearPacked, mode = 'truck', customSpecs = null, addStangaMode = false, onToggleStangaMode, stangaCount = 0, addSpanzetMode = false, onToggleSpanzetMode, spanzetCount = 0 }) => {
    const { t, lang } = useT();
    const { guard } = useUsage();
    const excelInputRef = useRef(null);
    const [step, setStep] = useState(1);
    const [truckType, setTruckType] = useState(null); // 'standard' or 'mega'
    const [sameSize, setSameSize] = useState(false);
    const [byTonnage, setByTonnage] = useState(false);
    const [totalTons, setTotalTons] = useState('');
    const [tonnageInfo, setTonnageInfo] = useState(null);
    const [resultData, setResultData] = useState(null);
    const [customDimensions, setCustomDimensions] = useState({ length: 1360, width: 245, height: 275 });
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [excelModal, setExcelModal] = useState(false);
    const productListRef = useRef(null);
    const navigate = useNavigate();

    const stepTitles = { 1: t('wizard.stepTitles.1'), 2: t('wizard.stepTitles.2'), 3: t('wizard.stepTitles.3') };

    const isTrain = mode === 'train';
    const isPlane = mode === 'plane';
    const isShip = mode === 'ship';
    const typeLabel = (isTrain || isShip) ? t('truckTypes.type.container') : isPlane ? t('truckTypes.type.uld') : t('truckTypes.type.trailer');

    // Initial product state
    const [products, setProducts] = useState([
        { id: 1, name: '', length: '', width: '', height: '', weight: '', quantity: '', maxStack: 1, allowRotation: false, color: '', stackable: true, useTotalWeight: false, totalWeight: '' }
    ]);

    const handleResetAll = () => {
        setStep(1);
        setTruckType(null);
        setSameSize(false);
        setByTonnage(false);
        setTotalTons('');
        setTonnageInfo(null);
        setResultData(null);
        setProducts([{ id: 1, name: '', length: '', width: '', height: '', weight: '', quantity: '', maxStack: 1, allowRotation: false, color: '', stackable: true, useTotalWeight: false, totalWeight: '' }]);
        if (onFullReset) onFullReset();
    };

    // Auto-scroll logic
    useEffect(() => {
        if (productListRef.current) {
            productListRef.current.scrollTo({
                top: productListRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [products.length]);

    const TRUCK_SPECS = customSpecs || (isShip ? {
        standard20: { label: '20 ft ' + t('truckTypes.standard'), dims: '5.90m x 2.35m x 2.39m', length: 590, width: 235, height: 239, maxWeight: 28000 },
        standard40: { label: '40 ft ' + t('truckTypes.standard'), dims: '12.03m x 2.35m x 2.39m', length: 1203, width: 235, height: 239, maxWeight: 26500 },
        highCube40: { label: '40 ft High Cube', dims: '12.03m x 2.35m x 2.69m', length: 1203, width: 235, height: 269, maxWeight: 26500 }
    } : {
        standard: isPlane
            ? { label: t('truckTypes.standardUld'), dims: '3.18m x 2.44m x 1.60m', height: 160, width: 244, length: 318, maxWeight: 4500 }
            : { label: isTrain ? t('truckTypes.standardCnt') : t('truckTypes.standard'), dims: isTrain ? '14.00m x 2.80m x 2.80m' : '13.60m x 2.45m x 2.75m', height: isTrain ? 280 : 275, width: isTrain ? 280 : 245, length: isTrain ? 1400 : 1360, maxWeight: 22000 },
        mega: isPlane
            ? { label: t('truckTypes.megaUld'), dims: '3.18m x 2.44m x 3.00m', height: 300, width: 244, length: 318, maxWeight: 6800 }
            : { label: isTrain ? t('truckTypes.megaCnt') : t('truckTypes.mega'), dims: isTrain ? '14.00m x 3.00m x 3.20m' : '13.60m x 2.45m x 2.95m', height: isTrain ? 320 : 295, width: isTrain ? 300 : 245, length: isTrain ? 1400 : 1360, maxWeight: 22000 },
        ...((!isTrain && !isPlane && !isShip) ? {
            closedBox: { label: t('truckTypes.closedBox'), dims: '13.60m x 2.45m x 2.75m', height: 275, width: 245, length: 1360, maxWeight: 22000 },
            custom: { label: t('truckTypes.custom'), dims: t('truckTypes.customDims'), height: 0, width: 0, length: 0, maxWeight: 0 }
        } : {})
    });


    // --- Actions ---

    const handleSelectTruck = (type) => {
        setTruckType(type);
        if (type !== 'custom') {
            setTimeout(() => setStep(2), 300);
        }
    };

    const handleCustomContinue = () => {
        if (!customDimensions.length || !customDimensions.width || !customDimensions.height) {
            alert(t('wizard.fillAll'));
            return;
        }
        setStep(2);
    };

    const addProduct = () => {
        if (products.length >= 20) {
            alert(t('wizard.maxProducts'));
            return;
        }
        // Force off tonnage mode when adding additional products
        if (byTonnage) setByTonnage(false);
        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        setProducts([...products, {
            id: newId,
            name: '',
            length: '', width: '', height: '', weight: '', quantity: sameSize ? '' : '1',
            maxStack: 1, allowRotation: false, color: '', stackable: true,
            useTotalWeight: false, totalWeight: ''
        }]);
    };

    const removeProduct = (id) => {
        setProducts(products.filter(p => p.id !== id));
    };

    // --- Excel import / template ---
    const handleDownloadTemplate = async () => {
        try {
            await downloadProductTemplate(lang);
        } catch (e) {
            alert(t('wizard.excelError'));
        }
    };

    const handleExcelFile = async (e) => {
        const file = e.target.files && e.target.files[0];
        // Reset the input so the same file can be re-selected later.
        e.target.value = '';
        if (!file) return;
        try {
            const imported = await parseProductsFile(file);
            if (!imported.length) {
                alert(t('wizard.excelEmpty'));
                return;
            }
            // Excel rows have explicit per-row sizes, so turn off the
            // "all same size" / tonnage shortcuts and load the full list.
            setSameSize(false);
            setByTonnage(false);
            setProducts(imported.slice(0, 20));
            if (imported.length > 20) alert(t('wizard.maxProducts'));
            alert(t('wizard.excelLoaded', { count: Math.min(imported.length, 20) }));
        } catch (err) {
            alert(t('wizard.excelError'));
        }
    };

    const updateProduct = (id, field, value) => {
        let newProducts = products.map(p => p.id === id ? { ...p, [field]: value } : p);

        // Auto-calculate Max Stack if HEIGHT changes
        if (field === 'height' && value) {
            const h = parseFloat(value);
            const truckH = truckType === 'custom' ? parseFloat(customDimensions.height) : TRUCK_SPECS[truckType].height; // e.g., 270
            if (h > 0) {
                const maxPossible = Math.floor(truckH / h);
                const suggested = maxPossible > 0 ? maxPossible : 1;
                newProducts = newProducts.map(p => p.id === id ? { ...p, maxStack: suggested } : p);
            }
        }

        setProducts(newProducts);
    };

    const toggleRotation = (id) => {
        setProducts(products.map(p => {
            if (p.id !== id) return p;
            return { ...p, allowRotation: !p.allowRotation };
        }));
    };

    // Mobile drawer orchestration:
    //  - Step 2 (product entry): auto-open so the user sees the form immediately after picking a type.
    //  - Step 3 (results): auto-close so the 3D scene with the packed truck is visible.
    //  - Step 1 (type selection): closed by default, user can tap handle.
    useEffect(() => {
        if (step === 2) setDrawerOpen(true);
        else setDrawerOpen(false);
    }, [step]);

    const handleCalculate = async () => {
        // Free-tier gate: a stacking run counts as one service use. When the
        // daily quota is exhausted the paywall opens and we abort the run.
        const allowed = await guard('stacking', mode);
        if (!allowed) return;

        // If "sameSize" is true, we only care about the first product in the list
        const sourceProducts = sameSize ? [products[0]] : products;

        // Per-product tonnage normalization: when a product has the "use total
        // weight" toggle on, derive the unit weight from totalWeight/quantity
        // so the packer downstream only ever sees per-unit weight.
        let tonnageInfoLocal = null;
        const workingProducts = sourceProducts.map(p => {
            if (!p.useTotalWeight) return p;
            const totalKg = parseFloat(p.totalWeight);
            const qty = parseInt(p.quantity);
            if (!totalKg || totalKg <= 0 || !qty || qty <= 0) return p; // let validator catch it
            const unitKg = totalKg / qty;
            // Surface a small summary for the first such product so step-3 can
            // mention the derivation. Keeps backwards-compatible UI.
            if (!tonnageInfoLocal) {
                tonnageInfoLocal = { totalKg, unitKg, derivedQty: qty, perProduct: true, productId: p.id };
            }
            return { ...p, weight: String(unitKg) };
        });

        const validProducts = workingProducts.filter(p => p.length && p.width && p.height && p.quantity && p.weight);
        if (validProducts.length === 0) {
            alert(t('wizard.invalid'));
            return;
        }

        let truck = TRUCK_SPECS[truckType];
        if (truckType === 'custom') {
            truck = {
                ...truck,
                length: parseFloat(customDimensions.length),
                width: parseFloat(customDimensions.width),
                height: parseFloat(customDimensions.height),
                maxWeight: 22000,
                dims: `${(customDimensions.length / 100).toFixed(2)}m x ${(customDimensions.width / 100).toFixed(2)}m x ${(customDimensions.height / 100).toFixed(2)}m`
            };
        }

        const result = onCalculate(truck, validProducts);
        if (result) {
            // Fire-and-forget log of any user-entered product names so the
            // admin can review what visitors actually called their cargo. We
            // group by a per-tab session id (sessionStorage) so all the
            // calculations from one visit show up together.
            try {
                const names = validProducts
                    .map(p => (p.name || '').trim())
                    .filter(Boolean);
                if (names.length > 0) {
                    let sid = sessionStorage.getItem('ldm_session_id');
                    if (!sid) {
                        sid = (crypto.randomUUID && crypto.randomUUID()) ||
                              (Date.now().toString(36) + Math.random().toString(36).slice(2));
                        sessionStorage.setItem('ldm_session_id', sid);
                    }
                    fetch('/api/product-names-log', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ session_id: sid, names })
                    }).catch(() => {});
                }
            } catch (_) { /* noop */ }

            if (tonnageInfoLocal) {
                const fitBoxes = result.totalItems;
                const fitKg = fitBoxes * tonnageInfoLocal.unitKg;
                const remainKg = Math.max(0, tonnageInfoLocal.totalKg - fitKg);
                const overWeight = (tonnageInfoLocal.derivedQty * tonnageInfoLocal.unitKg) > (truck.maxWeight || 0);
                tonnageInfoLocal = { ...tonnageInfoLocal, fitBoxes, fitKg, remainKg, overWeight, truckMaxKg: truck.maxWeight };
            }
            setTonnageInfo(tonnageInfoLocal);
            setResultData(result);
            setStep(3);
        }
    };

    // --- Render Helpers ---

    const renderStep1 = () => (
        <div className="step active">
            <h1 className="step-title">{t('wizard.selectType', { type: typeLabel })}</h1>
            <p className="step-description">{t('wizard.selectTypeDesc', { typeLower: typeLabel.toLowerCase() })}</p>

            <div className="options-grid" style={{ gridTemplateColumns: isShip ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '15px' }}>
                {Object.keys(TRUCK_SPECS).map(type => (
                    <button
                        key={type}
                        className={`ai-btn ${truckType === type ? 'ai-btn-primary' : ''}`}
                        onClick={() => handleSelectTruck(type)}
                        style={{ height: 'auto', padding: '2px' }}
                    >
                        <div className="ai-btn-inner" style={{ flexDirection: 'column', padding: '20px 10px', height: '100%', gap: '8px' }}>
                            <h3 style={{ fontSize: '1.1rem', margin: '0', color: 'white' }}>{TRUCK_SPECS[type].label}</h3>
                            <p className="option-specs" style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0' }}>{TRUCK_SPECS[type].dims}</p>
                        </div>
                    </button>
                ))}
            </div>

            {truckType === 'custom' && (
                <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '15px' }}>{t('wizard.customDimsTitle')}</h3>
                    <div className="product-inputs" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                        <div className="ai-input-group">
                            <span className="ai-input-label">{t('wizard.lengthCm')}</span>
                            <div className="ai-input-container">
                                <div className="ai-input-inner">
                                    <input
                                        type="number"
                                        placeholder="1360"
                                        value={customDimensions.length}
                                        onChange={(e) => setCustomDimensions({ ...customDimensions, length: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="ai-input-group">
                            <span className="ai-input-label">{t('wizard.widthCm')}</span>
                            <div className="ai-input-container">
                                <div className="ai-input-inner">
                                    <input
                                        type="number"
                                        placeholder="245"
                                        value={customDimensions.width}
                                        onChange={(e) => setCustomDimensions({ ...customDimensions, width: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="ai-input-group">
                            <span className="ai-input-label">{t('wizard.heightCm')}</span>
                            <div className="ai-input-container">
                                <div className="ai-input-inner">
                                    <input
                                        type="number"
                                        placeholder="275"
                                        value={customDimensions.height}
                                        onChange={(e) => setCustomDimensions({ ...customDimensions, height: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <button className="ai-btn ai-btn-primary" onClick={handleCustomContinue} style={{ marginTop: '20px', width: '100%' }}>
                        <div className="ai-btn-inner">{t('wizard.continue')}</div>
                    </button>
                </div>
            )}
        </div>
    );

    const renderStep2 = () => (
        <div className="step active" style={{ width: '100%', maxWidth: '100%' }}>
            <h1 className="step-title">{t('wizard.step2Title')}</h1>
            <p className="step-description">
                {isPlane ? t('wizard.step2DescPlane') : isShip ? t('wizard.step2DescShip') : t('wizard.step2DescTruck')}
            </p>

            {isPlane && (
                <div style={{ marginBottom: '20px', padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    <div style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: '600' }}>{t('wizard.uldSelected')}: {TRUCK_SPECS[truckType]?.label}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t('wizard.uldDims')}: {TRUCK_SPECS[truckType]?.dims}</div>
                </div>
            )}

            {truckType === 'closedBox' && (
                <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(234, 88, 12, 0.15)', borderRadius: '10px', border: '1px solid #ea580c' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                        <div style={{ fontSize: '0.85rem', color: '#fb923c', lineHeight: '1.4' }}>
                            <strong>{t('truckTypes.closedBox')}</strong>: {t('wizard.closedBoxWarn')}
                        </div>
                    </div>
                </div>
            )}

            <div className="checkbox-group" style={{ marginBottom: '15px', padding: '0.5rem' }}>
                <label className="pulse-checkbox-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', width: 'auto' }}>
                    <div className="pulse-checkbox-wrapper">
                        <input
                            type="checkbox"
                            checked={sameSize}
                            onChange={(e) => setSameSize(e.target.checked)}
                        />
                        <div className="checkmark"></div>
                    </div>
                    <span className="checkbox-label" style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: '500' }}>
                        {t('wizard.allSameSize')}
                    </span>
                </label>
            </div>

{/* Per-product tonnage is now toggled inside each product card. */}

            <div className="product-list" ref={productListRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {products.map((product, index) => {
                    if (sameSize && index > 0) return null;

                    return (
                        <div key={product.id} className="product-row" style={{
                            background: 'rgba(255,255,255,0.03)',
                            padding: '12px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div className="product-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    {/* Editable product name with pencil icon. Empty falls back to "Product #N". */}
                                    <label
                                        className="product-name-edit"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                            padding: '4px 10px',
                                            cursor: 'text'
                                        }}
                                        title={t('wizard.editName') || 'Edit name'}
                                    >
                                        <span style={{ fontSize: '0.85rem', opacity: 0.7 }} aria-hidden="true">✏️</span>
                                        <input
                                            type="text"
                                            value={product.name}
                                            placeholder={`${t('wizard.product')} #${index + 1}`}
                                            onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                outline: 'none',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                fontSize: '0.9rem',
                                                width: `${Math.max((product.name?.length || 0) + 1, 14)}ch`,
                                                maxWidth: '180px'
                                            }}
                                        />
                                    </label>
                                    <div className="rotation-control">
                                        <label className="pulse-checkbox-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', width: 'auto', fontSize: '0.8rem' }}>
                                            <div className="pulse-checkbox-wrapper" style={{ fontSize: '0.8rem', width: '1.2em', height: '1.2em', minWidth: '1.2em' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={product.allowRotation}
                                                    onChange={() => toggleRotation(product.id)}
                                                />
                                                <div className="checkmark" style={{ height: '1.1em', width: '1.1em' }}></div>
                                            </div>
                                            <span style={{ color: '#94a3b8' }}>{t('wizard.rotate')}</span>
                                        </label>
                                    </div>
                                    {/* Color picker — overrides the auto-assigned palette color in the 3D scene. */}
                                    <label
                                        className="color-picker-control"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            color: '#94a3b8'
                                        }}
                                        title={t('wizard.colorTitle')}
                                    >
                                        <input
                                            type="color"
                                            value={product.color || '#3b82f6'}
                                            onChange={(e) => updateProduct(product.id, 'color', e.target.value)}
                                            style={{
                                                width: '24px',
                                                height: '24px',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                borderRadius: '6px',
                                                background: 'transparent',
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                        />
                                        <span>{t('wizard.color')}</span>
                                    </label>
                                    {/* Stackable / Unstackable toggle */}
                                    <label className="pulse-checkbox-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', width: 'auto', fontSize: '0.8rem' }}>
                                        <div className="pulse-checkbox-wrapper" style={{ fontSize: '0.8rem', width: '1.2em', height: '1.2em', minWidth: '1.2em' }}>
                                            <input
                                                type="checkbox"
                                                checked={product.stackable === false}
                                                onChange={(e) => updateProduct(product.id, 'stackable', !e.target.checked)}
                                            />
                                            <div className="checkmark" style={{ height: '1.1em', width: '1.1em' }}></div>
                                        </div>
                                        <span style={{ color: product.stackable === false ? '#fbbf24' : '#94a3b8', fontWeight: product.stackable === false ? 600 : 400 }}>
                                            {product.stackable === false ? t('wizard.unstackable') : t('wizard.stackable')}
                                        </span>
                                    </label>
                                </div>
                                {(!sameSize && products.length > 1) && (
                                    <button className="ai-btn ai-btn-danger ai-btn-icon" onClick={() => removeProduct(product.id)}>
                                        <div className="ai-btn-inner">×</div>
                                    </button>
                                )}
                            </div>

                            <div className="product-inputs">
                                <div className="ai-input-group">
                                    <span className="ai-input-label">{t('wizard.length')}</span>
                                    <div className="ai-input-container">
                                        <div className="ai-input-inner">
                                            <input type="number" placeholder="cm" value={product.length} onChange={(e) => updateProduct(product.id, 'length', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                <div className="ai-input-group">
                                    <span className="ai-input-label">{t('wizard.width')}</span>
                                    <div className="ai-input-container">
                                        <div className="ai-input-inner">
                                            <input type="number" placeholder="cm" value={product.width} onChange={(e) => updateProduct(product.id, 'width', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                <div className="ai-input-group">
                                    <span className="ai-input-label">{t('wizard.height')}</span>
                                    <div className="ai-input-container">
                                        <div className="ai-input-inner">
                                            <input type="number" placeholder="cm" value={product.height} onChange={(e) => updateProduct(product.id, 'height', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                <div className="ai-input-group">
                                    <span className="ai-input-label">
                                        {product.useTotalWeight ? t('wizard.totalWeightKg') : t('wizard.weight')}
                                    </span>
                                    <div className="ai-input-container" style={{ borderColor: product.useTotalWeight ? '#3b82f6' : 'transparent' }}>
                                        <div className="ai-input-inner">
                                            <input
                                                type="number"
                                                placeholder="kg"
                                                value={product.useTotalWeight ? product.totalWeight : product.weight}
                                                onChange={(e) => updateProduct(product.id, product.useTotalWeight ? 'totalWeight' : 'weight', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="ai-input-group">
                                    <span className="ai-input-label">{t('wizard.maxStack')}</span>
                                    <div className={`ai-input-container ${product.stackable === false ? 'maxstack-pulse' : ''}`}>
                                        <div className="ai-input-inner">
                                            <select value={product.maxStack} onChange={(e) => updateProduct(product.id, 'maxStack', e.target.value)} style={{ color: 'white' }}>
                                                {[...Array(10)].map((_, i) => <option key={i} value={i + 1} style={{ color: 'black' }}>{i + 1}</option>)}
                                                <option value="99" style={{ color: 'black' }}>{t('wizard.unlimited')}</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="ai-input-group">
                                    <span className="ai-input-label">{t('wizard.quantity')}</span>
                                    <div className="ai-input-container" style={{ borderColor: sameSize ? '#3b82f6' : 'transparent' }}>
                                        <div className="ai-input-inner">
                                            <input type="number" placeholder="#" value={product.quantity} onChange={(e) => updateProduct(product.id, 'quantity', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Per-product "use total weight" toggle. When checked the
                                weight input above accepts kg-total instead of kg-per-unit;
                                the algorithm derives unit weight = total / quantity. */}
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '8px', fontSize: '0.8rem', color: '#94a3b8' }}>
                                <input
                                    type="checkbox"
                                    checked={!!product.useTotalWeight}
                                    onChange={(e) => updateProduct(product.id, 'useTotalWeight', e.target.checked)}
                                />
                                {t('wizard.useTotalWeight')}
                            </label>
                        </div>
                    );
                })}
            </div>

            {!sameSize && (
                <button className="btn-add-product" onClick={addProduct} style={{ marginTop: '12px' }}>
                    {t('wizard.addProduct')}
                </button>
            )}

            {/* Excel: bulk-load the product list from a spreadsheet instead of
                typing each row. Download the template, fill it, upload it. */}
            <div style={{
                marginTop: '14px', padding: '10px 12px',
                background: 'rgba(16,185,129,0.08)', border: '1px dashed rgba(16,185,129,0.4)',
                borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
                <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>
                    {t('wizard.excelTitle')}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className={excelModal ? 'tpl-blink' : ''}
                        onClick={handleDownloadTemplate}
                        style={{
                            flex: '1 1 140px', padding: '8px 10px', cursor: 'pointer',
                            background: 'rgba(255,255,255,0.05)', color: '#e2e8f0',
                            border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
                            fontSize: '0.8rem', fontWeight: 600
                        }}
                    >
                        ⬇️ {t('wizard.excelTemplate')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setExcelModal(true)}
                        style={{
                            flex: '1 1 140px', padding: '8px 10px', cursor: 'pointer',
                            background: 'rgba(16,185,129,0.18)', color: '#d1fae5',
                            border: '1px solid rgba(16,185,129,0.5)', borderRadius: '8px',
                            fontSize: '0.8rem', fontWeight: 600
                        }}
                    >
                        📤 {t('wizard.excelUpload')}
                    </button>
                    <input
                        ref={excelInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleExcelFile}
                        style={{ display: 'none' }}
                    />
                </div>
                {/* Important: people must use the provided template, not their own file.
                    Placed below the buttons so "the template above" is accurate. */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '7px 10px', borderRadius: '8px', minWidth: 0,
                    background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.45)',
                }}>
                    <span style={{
                        flexShrink: 0, fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.04em',
                        color: '#0f172a', background: '#f59e0b', borderRadius: '6px',
                        padding: '2px 7px', lineHeight: 1.5,
                    }}>⚠ {t('wizard.important')}</span>
                    <span style={{
                        fontSize: '0.72rem', color: '#fcd34d', lineHeight: 1.4,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {t('wizard.excelWarning')}
                    </span>
                </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '12px' }}>
                <button className="ai-btn" onClick={() => setStep(1)} style={{ flex: 1 }}>
                    <div className="ai-btn-inner">{t('wizard.back')}</div>
                </button>
                <button className="ai-btn ai-btn-primary" onClick={handleCalculate} style={{ flex: 2 }}>
                    <div className="ai-btn-inner">{t('wizard.calc')}</div>
                </button>
            </div>

            {/* Custom mini-modal that replaces window.confirm before Excel upload.
                While open it also blinks the template button (.tpl-blink) so the
                user notices they must download/use the template first. */}
            {excelModal && (
                <div
                    onClick={() => setExcelModal(false)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(2,6,23,0.62)', backdropFilter: 'blur(2px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%', maxWidth: '360px',
                            background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
                            border: '1px solid rgba(245,158,11,0.45)', borderRadius: '14px',
                            padding: '18px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                            display: 'flex', flexDirection: 'column', gap: '12px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.04em',
                                color: '#0f172a', background: '#f59e0b', borderRadius: '6px',
                                padding: '3px 8px', lineHeight: 1.5,
                            }}>⚠ {t('wizard.important')}</span>
                        </div>
                        <div style={{ fontSize: '0.84rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                            {t('wizard.excelConfirm')}
                        </div>
                        <button
                            type="button"
                            className="tpl-blink"
                            onClick={handleDownloadTemplate}
                            style={{
                                padding: '9px 10px', cursor: 'pointer', width: '100%',
                                background: 'rgba(255,255,255,0.06)', color: '#e2e8f0',
                                border: '1px solid rgba(255,255,255,0.16)', borderRadius: '8px',
                                fontSize: '0.8rem', fontWeight: 600,
                            }}
                        >
                            ⬇️ {t('wizard.excelTemplate')}
                        </button>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                            <button
                                type="button"
                                onClick={() => setExcelModal(false)}
                                style={{
                                    flex: 1, padding: '9px 10px', cursor: 'pointer',
                                    background: 'rgba(255,255,255,0.05)', color: '#cbd5e1',
                                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
                                    fontSize: '0.8rem', fontWeight: 600,
                                }}
                            >
                                {t('viewer.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setExcelModal(false); excelInputRef.current && excelInputRef.current.click(); }}
                                style={{
                                    flex: 1.4, padding: '9px 10px', cursor: 'pointer',
                                    background: 'rgba(16,185,129,0.22)', color: '#d1fae5',
                                    border: '1px solid rgba(16,185,129,0.55)', borderRadius: '8px',
                                    fontSize: '0.8rem', fontWeight: 700,
                                }}
                            >
                                📤 {t('wizard.continue')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
// bir comment
    const renderStep3 = () => (
        <div className="step active" style={{ width: '100%' }}>
            <h1 className="step-title">{t('step3.title')}</h1>

            {resultData && (
                <div className="results-container" style={{ overflowY: 'auto', maxHeight: '60vh', paddingRight: '5px' }}>

                    {resultData.isOverloaded && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid #ef4444',
                            padding: '12px',
                            borderRadius: '10px',
                            marginBottom: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                            <div>
                                <h4 style={{ color: '#ef4444', margin: '0 0 4px 0', fontSize: '1rem' }}>{t('step3.overloaded')}</h4>
                                <p style={{ color: '#fca5a5', margin: 0, fontSize: '0.82rem' }}>
                                    {isPlane ? t('step3.overloadedDescPlane', { n: resultData.missingCount }) : t('step3.overloadedDescTruck', { n: resultData.missingCount })}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TRUCK LENGTH USAGE VISUALIZATION */}
                    {!isPlane && !isShip && resultData && (
                        <div style={{ marginBottom: '15px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: '#cbd5e1' }}>
                                <span>{truckType === 'custom' ? t('step3.customDorse') : t('step3.dorseUsage')}</span>
                                <span>{((resultData.placedItems.reduce((max, i) => Math.max(max, i.position.x + i.dimensions.length), 0) / (truckType === 'custom' ? parseFloat(customDimensions.length) : 1360)) * 100).toFixed(1)}% {t('step3.full')}</span>
                            </div>

                            {(() => {
                                // Calculate used length in cm
                                const usedLengthCm = resultData.placedItems.reduce((max, i) => Math.max(max, i.position.x + i.dimensions.length), 0);
                                const totalLengthCm = truckType === 'custom' ? parseFloat(customDimensions.length) : 1360;
                                const usedMeters = (usedLengthCm / 100).toFixed(2);
                                const emptyMeters = Math.max(0, (totalLengthCm - usedLengthCm) / 100).toFixed(2);

                                return (
                                    <>
                                        <div style={{ width: '100%', height: '12px', background: '#334155', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
                                            <div style={{ width: `${(usedLengthCm / totalLengthCm) * 100}%`, background: '#10b981', height: '100%' }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.8rem', fontWeight: '500' }}>
                                            <span style={{ color: '#10b981' }}>{t('step3.usedM', { m: usedMeters })}</span>
                                            <span style={{ color: '#94a3b8' }}>{t('step3.emptyM', { m: emptyMeters })}</span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {tonnageInfo && (
                        <div style={{ marginBottom: '15px', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59,130,246,0.35)', padding: '12px', borderRadius: '10px', color: '#dbeafe', fontSize: '0.85rem', lineHeight: 1.5 }}>
                            <div>{t('step3.tonnageSummary', {
                                total: (tonnageInfo.totalKg / 1000).toFixed(2),
                                fit: (tonnageInfo.fitKg / 1000).toFixed(2),
                                boxes: tonnageInfo.fitBoxes,
                                remain: (tonnageInfo.remainKg / 1000).toFixed(2)
                            })}</div>
                            {tonnageInfo.overWeight && (
                                <div style={{ marginTop: 6, color: '#fca5a5' }}>{t('step3.tonnageOverWeight')}</div>
                            )}
                        </div>
                    )}

                    <div className="summary-cards-grid">
                        <div className="summary-card">
                            <div className="summary-card-content">
                                <span className="summary-label">{t('step3.totalLoaded')}</span>
                                <span className="summary-value" style={{ fontSize: '1.1rem' }}>{resultData.totalItems} {t('step3.units')}</span>
                            </div>
                        </div>
                        <div className="summary-card">
                            <div className="summary-card-content">
                                <span className="summary-label">{t('step3.totalWeight')}</span>
                                <span className="summary-value" style={{ fontSize: '1.1rem' }}>{resultData.totalWeight.toLocaleString()} kg</span>
                            </div>
                        </div>
                        <div className="summary-card highlight" style={{ background: isPlane ? 'rgba(59, 130, 246, 0.2)' : '' }}>
                            <div className="summary-card-content">
                                <span className="summary-label" style={{ color: isPlane ? '#60a5fa' : '' }}>{isPlane ? t('step3.uldNeeded') : t('step3.efficiency')}</span>
                                <span className="summary-value" style={{ fontSize: '1.1rem' }}>{isPlane ? `${resultData.uldCount} ${t('step3.units')}` : `${resultData.efficiency.toFixed(1)}%`}</span>
                            </div>
                        </div>
                    </div>

                    {/* Axle balance — front/rear weight distribution. EU 96/53/EC
                        and Turkish road regulations require even axle loading. */}
                    {resultData.balance && !isPlane && (
                        <div style={{
                            marginTop: '1.2rem',
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: resultData.balance.warning ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.08)',
                            border: `1px solid ${resultData.balance.warning ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.3)'}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                                    {resultData.balance.warning ? '⚠️ ' : '✓ '}{t('step3.axleBalance') || 'Aks Yük Dengesi'}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    {t('step3.front') || 'Ön'}: {resultData.balance.frontPct.toFixed(0)}% / {t('step3.rear') || 'Arka'}: {resultData.balance.rearPct.toFixed(0)}%
                                </span>
                            </div>
                            <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden', display: 'flex' }}>
                                <div style={{ width: `${resultData.balance.frontPct}%`, background: '#3b82f6', transition: 'width 0.3s' }} />
                                <div style={{ width: `${resultData.balance.rearPct}%`, background: '#f59e0b', transition: 'width 0.3s' }} />
                            </div>
                            {resultData.balance.warning && (
                                <>
                                    <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '8px', lineHeight: 1.4 }}>
                                        {t('step3.balanceWarn')}
                                    </div>
                                    {onRebalance && (
                                        <button
                                            className="ai-btn"
                                            onClick={() => {
                                                const updated = onRebalance();
                                                if (updated) {
                                                    setResultData(updated);
                                                    if (updated.rebalanceInfo && !updated.rebalanceInfo.improved) {
                                                        alert(t('step3.rebalanceNoOp'));
                                                    }
                                                }
                                            }}
                                            style={{ marginTop: '10px', padding: '2px', height: '36px', width: '100%' }}
                                        >
                                            <div className="ai-btn-inner" style={{ padding: '0 14px', height: '100%', fontSize: '0.85rem', gap: '8px' }}>
                                                ⚖️ {t('step3.rebalance')}
                                            </div>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Manual Štanga + Spanzet add toggles — when active,
                        clicking a cargo item attaches the chosen restraint.
                        Modes are mutually exclusive at the App level. */}
                    {(onToggleStangaMode || onToggleSpanzetMode) && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '1.2rem' }}>
                            {onToggleStangaMode && (
                                <button
                                    className="ai-btn"
                                    onClick={onToggleStangaMode}
                                    style={{
                                        padding: '2px',
                                        height: '40px',
                                        flex: 1,
                                        background: addStangaMode
                                            ? 'linear-gradient(to top, #f59e0b, #fbbf24, #f59e0b)'
                                            : undefined
                                    }}
                                >
                                    <div className="ai-btn-inner" style={{ padding: '0 12px', height: '100%', fontSize: '0.8rem', gap: '6px', justifyContent: 'center' }}>
                                        {addStangaMode ? `✓ ${t('step3.stangaModeActive')} (${stangaCount})` : `🔧 ${t('step3.addStanga')}`}
                                    </div>
                                </button>
                            )}
                            {onToggleSpanzetMode && (
                                <button
                                    className="ai-btn"
                                    onClick={onToggleSpanzetMode}
                                    style={{
                                        padding: '2px',
                                        height: '40px',
                                        flex: 1,
                                        background: addSpanzetMode
                                            ? 'linear-gradient(to top, #7e22ce, #a855f7, #7e22ce)'
                                            : undefined
                                    }}
                                >
                                    <div className="ai-btn-inner" style={{ padding: '0 12px', height: '100%', fontSize: '0.8rem', gap: '6px', justifyContent: 'center' }}>
                                        {addSpanzetMode ? `✓ ${t('step3.spanzetModeActive')} (${spanzetCount})` : `🪢 ${t('step3.addSpanzet')}`}
                                    </div>
                                </button>
                            )}
                        </div>
                    )}

                    <div className="detailed-report" style={{ marginTop: '1.2rem' }}>
                        <h3 className="report-title" style={{ marginBottom: '0.8rem', fontSize: '1rem', color: '#94a3b8' }}>{t('step3.byProduct')}</h3>
                        <div className="report-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {Object.entries(resultData.itemBreakdown).map(([id, data]) => {
                                const original = products.find(p => p.id == id) || {};
                                return (
                                    <div key={id} className="report-card" style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px' }}>
                                        <div className="report-card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span className="report-id" style={{ fontWeight: 'bold', color: 'white', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                                {data.color && (
                                                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: data.color, display: 'inline-block', border: '1px solid rgba(255,255,255,0.2)' }} />
                                                )}
                                                {data.name && !data.name.startsWith('#') ? data.name : `${t('step3.product')} #${id}`}
                                            </span>
                                            <div style={{ textAlign: 'right' }}>
                                                <div className="report-count" style={{ color: '#10b981', fontSize: '0.85rem' }}>
                                                    {data.count}{data.requestedQuantity ? ` / ${data.requestedQuantity}` : ''} {t('step3.loaded')}
                                                </div>
                                                {data.unplaced > 0 ? (
                                                    <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: '600' }}>
                                                        {t('step3.notFit', { n: data.unplaced })}
                                                    </div>
                                                ) : (
                                                    <div className="report-remaining" style={{ color: data.remainingCapacity > 0 ? '#3b82f6' : '#64748b', fontSize: '0.75rem', fontWeight: '500' }}>
                                                        {t('step3.spaceLeft', { n: data.remainingCapacity })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {data.unplaced > 0 && data.rotationHint > 0 && (
                                            <div style={{
                                                marginTop: '6px',
                                                padding: '6px 8px',
                                                background: 'rgba(251, 191, 36, 0.12)',
                                                border: '1px solid rgba(251, 191, 36, 0.35)',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                color: '#fbbf24',
                                                lineHeight: '1.4'
                                            }}>
                                                💡 {t('step3.rotateHint', { n: data.rotationHint })}
                                            </div>
                                        )}
                                        <div className="report-dims" style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                                            {original.length}x{original.width}x{original.height} cm
                                        </div>
                                        <div className="report-stats" style={{ display: 'flex', gap: '12px', fontSize: '0.9rem', color: '#cbd5e1' }}>
                                            <div><span style={{ color: '#64748b' }}>{t('step3.row')}:</span> {data.rows}</div>
                                            <div><span style={{ color: '#64748b' }}>{t('step3.col')}:</span> {data.columns}</div>
                                            <div><span style={{ color: '#64748b' }}>{t('step3.layer')}:</span> {data.layers}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div className="results-actions" style={{ marginTop: '1.2rem', display: 'flex', gap: '10px' }}>
                <button className="ai-btn" onClick={() => {
                    setStep(2);
                    setResultData(null);
                    if (onClearPacked) onClearPacked();
                }} style={{ flex: 1 }}>
                    <div className="ai-btn-inner">{t('wizard.editRecalc')}</div>
                </button>
                <button className="ai-btn ai-btn-primary" onClick={handleResetAll} style={{ flex: 1 }}>
                    <div className="ai-btn-inner">{t('wizard.resetAll')}</div>
                </button>
            </div>
        </div>
    );

    return (
        <div className={`wizard-section ${drawerOpen ? 'drawer-open' : ''}`}>
            {/* BACK BUTTON */}
            <button
                className="ai-btn"
                onClick={() => navigate('/')}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    zIndex: 100,
                    padding: '2px',
                    height: '40px'
                }}
            >
                <div className="ai-btn-inner" style={{ padding: '0 16px', height: '100%', gap: '8px', fontSize: '0.85rem' }}>
                    <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>←</span> {t('viewer.backHome')}
                </div>
            </button>

            {/* Language switcher — desktop: top-right next to back button.
                Mobile: floating flag-only circle on left middle of viewport. */}
            <div className="lang-switcher-desktop" style={{ position: 'absolute', top: 20, right: 240, zIndex: 100, display: 'flex', gap: 10, alignItems: 'center' }}>
                <AccountMenu height={40} compact />
                <LanguageSwitcher height={40} compact />
            </div>
            <div className="lang-switcher-mobile" style={{ position: 'fixed', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 250 }}>
                <LanguageSwitcher flagOnly height={44} />
            </div>

            {/* MOBILE STICKY DRAWER HANDLE — visible only via CSS on mobile */}
            <button
                className="mobile-drawer-handle"
                onClick={() => setDrawerOpen(v => !v)}
                aria-label={t('wizard.drawerAria')}
            >
                <span className="drawer-step-dot">{step}</span>
                <span className="drawer-step-title">{stepTitles[step]}</span>
                <span className={`drawer-chevron ${drawerOpen ? 'up' : ''}`}>▲</span>
            </button>

            <div className="wizard-container">
                <StepLoader step={step} />

                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </div>
        </div>
    );
};

export default InputWizard;
