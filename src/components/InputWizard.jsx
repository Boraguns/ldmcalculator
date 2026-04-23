import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../checkbox.css';
import '../input-style.css';
import StepLoader from './StepLoader';

const InputWizard = ({ onCalculate, onFullReset, onClearPacked, mode = 'truck', customSpecs = null }) => {
    const [step, setStep] = useState(1);
    const [truckType, setTruckType] = useState(null); // 'standard' or 'mega'
    const [sameSize, setSameSize] = useState(false);
    const [resultData, setResultData] = useState(null);
    const [customDimensions, setCustomDimensions] = useState({ length: 1360, width: 245, height: 275 });
    const productListRef = useRef(null);
    const navigate = useNavigate();

    const isTrain = mode === 'train';
    const isPlane = mode === 'plane';
    const isShip = mode === 'ship';
    const typeLabel = (isTrain || isShip) ? 'Konteyner' : isPlane ? 'ULD' : 'Dorse';

    // Initial product state
    const [products, setProducts] = useState([
        { id: 1, length: '', width: '', height: '', weight: '', quantity: '', maxStack: 1, allowRotation: false }
    ]);

    const handleResetAll = () => {
        setStep(1);
        setTruckType(null);
        setSameSize(false);
        setResultData(null);
        setProducts([{ id: 1, length: '', width: '', height: '', weight: '', quantity: '', maxStack: 1, allowRotation: false }]);
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
        standard20: { label: '20 ft Standart', dims: '5.90m x 2.35m x 2.39m', length: 590, width: 235, height: 239, maxWeight: 28000 },
        standard40: { label: '40 ft Standart', dims: '12.03m x 2.35m x 2.39m', length: 1203, width: 235, height: 239, maxWeight: 26500 },
        highCube40: { label: '40 ft High Cube', dims: '12.03m x 2.35m x 2.69m', length: 1203, width: 235, height: 269, maxWeight: 26500 }
    } : {
        standard: isPlane
            ? { label: 'Standart ULD (PMC/PLA)', dims: '3.18m x 2.44m x 1.60m', height: 160, width: 244, length: 318, maxWeight: 4500 }
            : { label: isTrain ? 'Standart Konteyner' : 'Standart Dorse', dims: isTrain ? '14.00m x 2.80m x 2.80m' : '13.60m x 2.45m x 2.75m', height: isTrain ? 280 : 275, width: isTrain ? 280 : 245, length: isTrain ? 1400 : 1360, maxWeight: 22000 },
        mega: isPlane
            ? { label: 'Yüksek Hacimli ULD', dims: '3.18m x 2.44m x 3.00m', height: 300, width: 244, length: 318, maxWeight: 6800 }
            : { label: isTrain ? 'Mega Konteyner' : 'Mega Dorse', dims: isTrain ? '14.00m x 3.00m x 3.20m' : '13.60m x 2.45m x 2.95m', height: isTrain ? 320 : 295, width: isTrain ? 300 : 245, length: isTrain ? 1400 : 1360, maxWeight: 22000 },
        ...((!isTrain && !isPlane && !isShip) ? {
            closedBox: { label: 'Kapalı Kasa Dorse', dims: '13.60m x 2.45m x 2.75m', height: 275, width: 245, length: 1360, maxWeight: 22000 },
            custom: { label: 'Özel Ölçü Dorse', dims: 'Ölçüleri Kendin Belirle', height: 0, width: 0, length: 0, maxWeight: 0 }
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
            alert('Lütfen tüm boyutları giriniz.');
            return;
        }
        setStep(2);
    };

    const addProduct = () => {
        if (products.length >= 20) {
            alert('En fazla 20 farklı ürün ekleyebilirsiniz!');
            return;
        }
        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        setProducts([...products, {
            id: newId,
            length: '', width: '', height: '', weight: '', quantity: sameSize ? '' : '1',
            maxStack: 1, allowRotation: false
        }]);
    };

    const removeProduct = (id) => {
        setProducts(products.filter(p => p.id !== id));
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

    const handleCalculate = () => {
        // If "sameSize" is true, we only care about the first product in the list
        const sourceProducts = sameSize ? [products[0]] : products;

        const validProducts = sourceProducts.filter(p => p.length && p.width && p.height && p.quantity);
        if (validProducts.length === 0) {
            alert('Lütfen geçerli ürün bilgileri girin.');
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
            setResultData(result);
            setStep(3);
        }
    };

    // --- Render Helpers ---

    const renderStep1 = () => (
        <div className="step active">
            <h1 className="step-title">{typeLabel} Tipini Seçin</h1>
            <p className="step-description">Kargo taşıyacağınız {typeLabel.toLowerCase()}i belirleyin</p>

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
                    <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '15px' }}>Özel Dorse Ölçüleri (cm)</h3>
                    <div className="product-inputs" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                        <div className="ai-input-group">
                            <span className="ai-input-label">Uzunluk (cm)</span>
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
                            <span className="ai-input-label">Genişlik (cm)</span>
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
                            <span className="ai-input-label">Yükseklik (cm)</span>
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
                        <div className="ai-btn-inner">Devam Et</div>
                    </button>
                </div>
            )}
        </div>
    );

    const renderStep2 = () => (
        <div className="step active" style={{ width: '100%', maxWidth: '100%' }}>
            <h1 className="step-title">Gönderi Boyutlarını Girin</h1>
            <p className="step-description">
                {isPlane ? 'Uçak kargo (ULD)' : isShip ? 'Gemi konteyner' : 'Yük'} için tüm ürünlerinizin ölçülerini girin
            </p>

            {isPlane && (
                <div style={{ marginBottom: '20px', padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    <div style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: '600' }}>Seçili ULD: {TRUCK_SPECS[truckType]?.label}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Ölçüler: {TRUCK_SPECS[truckType]?.dims}</div>
                </div>
            )}

            {truckType === 'closedBox' && (
                <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(234, 88, 12, 0.15)', borderRadius: '10px', border: '1px solid #ea580c' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                        <div style={{ fontSize: '0.85rem', color: '#fb923c', lineHeight: '1.4' }}>
                            <strong>Kapalı Kasa Dorse</strong> tipinde yük sadece dorsenin arka kapağından yüklenebilmektedir. Bu hususu lütfen dikkate alınız.
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
                        Tüm ürünlerim aynı boyda
                    </span>
                </label>
            </div>

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
                            <div className="product-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span className="product-number" style={{ fontWeight: 'bold', color: 'white', fontSize: '0.9rem' }}>Ürün #{index + 1}</span>
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
                                            <span style={{ color: '#94a3b8' }}>Döndür</span>
                                        </label>
                                    </div>
                                </div>
                                {(!sameSize && products.length > 1) && (
                                    <button className="ai-btn ai-btn-danger ai-btn-icon" onClick={() => removeProduct(product.id)}>
                                        <div className="ai-btn-inner">×</div>
                                    </button>
                                )}
                            </div>

                            <div className="product-inputs">
                                <div className="ai-input-group">
                                    <span className="ai-input-label">Uzunluk</span>
                                    <div className="ai-input-container">
                                        <div className="ai-input-inner">
                                            <input type="number" placeholder="cm" value={product.length} onChange={(e) => updateProduct(product.id, 'length', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                <div className="ai-input-group">
                                    <span className="ai-input-label">Genişlik</span>
                                    <div className="ai-input-container">
                                        <div className="ai-input-inner">
                                            <input type="number" placeholder="cm" value={product.width} onChange={(e) => updateProduct(product.id, 'width', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                <div className="ai-input-group">
                                    <span className="ai-input-label">Yükseklik</span>
                                    <div className="ai-input-container">
                                        <div className="ai-input-inner">
                                            <input type="number" placeholder="cm" value={product.height} onChange={(e) => updateProduct(product.id, 'height', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                <div className="ai-input-group">
                                    <span className="ai-input-label">Ağırlık</span>
                                    <div className="ai-input-container">
                                        <div className="ai-input-inner">
                                            <input type="number" placeholder="kg" value={product.weight} onChange={(e) => updateProduct(product.id, 'weight', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                <div className="ai-input-group">
                                    <span className="ai-input-label">Max Sıra</span>
                                    <div className="ai-input-container">
                                        <div className="ai-input-inner">
                                            <select value={product.maxStack} onChange={(e) => updateProduct(product.id, 'maxStack', e.target.value)} style={{ color: 'white' }}>
                                                {[...Array(10)].map((_, i) => <option key={i} value={i + 1} style={{ color: 'black' }}>{i + 1}</option>)}
                                                <option value="99" style={{ color: 'black' }}>Sınırsız</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="ai-input-group">
                                    <span className="ai-input-label">Adet</span>
                                    <div className="ai-input-container" style={{ borderColor: sameSize ? '#3b82f6' : 'transparent' }}>
                                        <div className="ai-input-inner">
                                            <input type="number" placeholder="#" value={product.quantity} onChange={(e) => updateProduct(product.id, 'quantity', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {!sameSize && (
                <button className="btn-add-product" onClick={addProduct} style={{ marginTop: '12px' }}>
                    Yeni Ürün Ekle
                </button>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '12px' }}>
                <button className="ai-btn" onClick={() => setStep(1)} style={{ flex: 1 }}>
                    <div className="ai-btn-inner">Geri</div>
                </button>
                <button className="ai-btn ai-btn-primary" onClick={handleCalculate} style={{ flex: 2 }}>
                    <div className="ai-btn-inner">Optimum İstiflemeyi Hesapla</div>
                </button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="step active" style={{ width: '100%' }}>
            <h1 className="step-title">Sonuç Raporu</h1>

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
                                <h4 style={{ color: '#ef4444', margin: '0 0 4px 0', fontSize: '1rem' }}>Fazla Yükleme Tespit Edildi!</h4>
                                <p style={{ color: '#fca5a5', margin: 0, fontSize: '0.82rem' }}>
                                    Talep edilen ürünlerden <strong>{resultData.missingCount} adet</strong> {isPlane ? 'kapasiteyi aştı' : 'tıra sığmadı'}.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TRUCK LENGTH USAGE VISUALIZATION */}
                    {!isPlane && !isShip && resultData && (
                        <div style={{ marginBottom: '15px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: '#cbd5e1' }}>
                                <span>{truckType === 'custom' ? 'Özel Dorse' : '13.60m Dorse'} Kullanımı</span>
                                <span>%{((resultData.placedItems.reduce((max, i) => Math.max(max, i.position.x + i.dimensions.length), 0) / (truckType === 'custom' ? parseFloat(customDimensions.length) : 1360)) * 100).toFixed(1)} Dolu</span>
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
                                            <span style={{ color: '#10b981' }}>{usedMeters}m Dolu</span>
                                            <span style={{ color: '#94a3b8' }}>{emptyMeters}m Boş</span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    <div className="summary-cards-grid">
                        <div className="summary-card">
                            <div className="summary-card-content">
                                <span className="summary-label">Toplam Yüklenen</span>
                                <span className="summary-value" style={{ fontSize: '1.1rem' }}>{resultData.totalItems} Adet</span>
                            </div>
                        </div>
                        <div className="summary-card">
                            <div className="summary-card-content">
                                <span className="summary-label">Toplam Ağırlık</span>
                                <span className="summary-value" style={{ fontSize: '1.1rem' }}>{resultData.totalWeight.toLocaleString()} kg</span>
                            </div>
                        </div>
                        <div className="summary-card highlight" style={{ background: isPlane ? 'rgba(59, 130, 246, 0.2)' : '' }}>
                            <div className="summary-card-content">
                                <span className="summary-label" style={{ color: isPlane ? '#60a5fa' : '' }}>{isPlane ? 'Toplam ULD İhtiyacı' : 'Hacim Verimliliği'}</span>
                                <span className="summary-value" style={{ fontSize: '1.1rem' }}>{isPlane ? `${resultData.uldCount} Adet` : `%${resultData.efficiency.toFixed(1)}`}</span>
                            </div>
                        </div>
                    </div>

                    <div className="detailed-report" style={{ marginTop: '1.2rem' }}>
                        <h3 className="report-title" style={{ marginBottom: '0.8rem', fontSize: '1rem', color: '#94a3b8' }}>Ürün Bazlı Detay</h3>
                        <div className="report-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {Object.entries(resultData.itemBreakdown).map(([id, data]) => {
                                const original = products.find(p => p.id == id) || {};
                                return (
                                    <div key={id} className="report-card" style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px' }}>
                                        <div className="report-card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span className="report-id" style={{ fontWeight: 'bold', color: 'white', fontSize: '0.9rem' }}>Ürün #{id}</span>
                                            <div style={{ textAlign: 'right' }}>
                                                <div className="report-count" style={{ color: '#10b981', fontSize: '0.85rem' }}>{data.count} Yüklendi</div>
                                                <div className="report-remaining" style={{ color: data.remainingCapacity > 0 ? '#3b82f6' : '#64748b', fontSize: '0.75rem', fontWeight: '500' }}>
                                                    {data.remainingCapacity} adet yer kaldı
                                                </div>
                                            </div>
                                        </div>
                                        <div className="report-dims" style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                                            {original.length}x{original.width}x{original.height} cm
                                        </div>
                                        <div className="report-stats" style={{ display: 'flex', gap: '12px', fontSize: '0.9rem', color: '#cbd5e1' }}>
                                            <div><span style={{ color: '#64748b' }}>Sıra:</span> {data.rows}</div>
                                            <div><span style={{ color: '#64748b' }}>Sütun:</span> {data.columns}</div>
                                            <div><span style={{ color: '#64748b' }}>Kat:</span> {data.layers}</div>
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
                    <div className="ai-btn-inner">Düzenle ve Yeniden Hesapla</div>
                </button>
                <button className="ai-btn ai-btn-primary" onClick={handleResetAll} style={{ flex: 1 }}>
                    <div className="ai-btn-inner">Sıfırdan Hesapla</div>
                </button>
            </div>
        </div>
    );

    return (
        <div className="wizard-section">
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
                    height: '40px' // Total 40px matching Screenshot button
                }}
            >
                <div className="ai-btn-inner" style={{ padding: '0 16px', height: '100%', gap: '8px', fontSize: '0.85rem' }}>
                    <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>←</span> Ana Menüye Dön
                </div>
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
