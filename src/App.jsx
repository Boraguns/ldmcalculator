import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import ModelViewer from './components/ModelViewer';
import InputWizard from './components/InputWizard';
import { BinPacking3D } from './utils/binpacking';
import Home from './pages/Home';
import PlaceholderPage from './pages/PlaceholderPage';

const GeneralCalculator = ({ mode = 'truck' }) => {
    const [specs, setSpecs] = useState(null);
    const [packedItems, setPackedItems] = useState([]);
    const [viewMode, setViewMode] = useState('iso');
    const [hoveredItem, setHoveredItem] = useState(null);
    const [showScreenshotModal, setShowScreenshotModal] = useState(false);
    const [companyName, setCompanyName] = useState('');
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
                setPackedItems(result.placedItems);
            } else {
                alert('Ürünler sığmadı veya bir hata oluştu.');
                setPackedItems([]);
            }
            return result;
        } catch (error) {
            console.error("Error:", error);
            alert('Hata oluştu');
        }
        return null;
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

        // Create a temporary canvas to add background color
        // This ensures transparency doesn't ruin the image on different viewers
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = actualCanvas.width;
        tempCanvas.height = actualCanvas.height;
        const ctx = tempCanvas.getContext('2d');

        // Fill background with App's dark theme color to ensure white wireframes are visible
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw the 3D scene on top
        ctx.drawImage(actualCanvas, 0, 0);

        const link = document.createElement('a');
        const timestamp = new Date().getTime();
        const safeName = companyName ? companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'adsiz';
        link.download = `${safeName}-${mode}-loading-${timestamp}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();

        // Modal logic
        setShowScreenshotModal(false);
        alert(`Ekran görüntüsü indirildi ve ${companyName || 'Belirtilmemiş'} firması için sisteme (Gmail) gönderim sırasına alındı.`);
        // Note: Real email sending would happen here via API or SMTP service
    };

    const handleFullReset = () => {
        setSpecs(null);
        setPackedItems([]);
        setHoveredItem(null);
    };

    const legendItems = [...new Set(packedItems.map(i => i.id))].map(id => {
        const item = packedItems.find(i => i.id === id);
        const count = packedItems.filter(i => i.id === id).length;
        return { id, count, colorId: id };
    });

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
                    src="/src/ldm-calculator-beyaz-logo.png"
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
                                📸 Ekran Görüntüsü Al
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
                            { id: 'iso', label: 'İzometrik' },
                            { id: 'top', label: 'Üst Bakış' },
                            { id: 'side', label: 'Yan Bakış' },
                            { id: 'front', label: 'Ön Bakış' },
                            { id: 'back', label: 'Arka Bakış' }
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
                            <h4 style={{ margin: '0 0 8px 0', color: 'white', fontSize: '0.9rem' }}>Yüklenen Ürünler</h4>
                            {legendItems.map(l => (
                                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: 'white', fontSize: '0.8rem' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: colors[l.colorId % colors.length] }}></div>
                                    <span>#{l.id} - {l.count} Adet</span>
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
                            <div>Ürün #{hoveredItem.item.id}</div>
                            <div style={{ fontSize: '0.75rem', color: '#666' }}>
                                {hoveredItem.item.dimensions.length}x{hoveredItem.item.dimensions.width}x{hoveredItem.item.dimensions.height}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: WIZARD */}
            <InputWizard onCalculate={handleCalculate} onFullReset={handleFullReset} mode={mode} />

            {/* SCREENSHOT MODAL */}
            {showScreenshotModal && (
                <div className="modal-overlay" onClick={() => setShowScreenshotModal(false)}>
                    <div className="ldm-modal" onClick={e => e.stopPropagation()}>
                        <h2 style={{ color: 'white', marginBottom: '20px', textAlign: 'center' }}>Ekran Görüntüsü Kaydet</h2>

                        <div className="ai-input-group" style={{ marginBottom: '25px' }}>
                            <label className="ai-input-label">Firmanızın Adını Yazınız</label>
                            <div className="ai-input-container">
                                <div className="ai-input-inner">
                                    <input
                                        type="text"
                                        placeholder="Firma Adı (opsiyonel)"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="ai-btn" onClick={() => setShowScreenshotModal(false)} style={{ flex: 1, height: '44px' }}>
                                <div className="ai-btn-inner">Vazgeç</div>
                            </button>
                            <button
                                className="ai-btn ai-btn-primary"
                                onClick={handleDownload}
                                style={{ flex: 2, height: '44px' }}
                            >
                                <div className="ai-btn-inner" style={{ background: '#3b82f6', color: 'white' }}>
                                    Ekran Görüntüsünü İndir
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
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/truck" element={<GeneralCalculator mode="truck" />} />
                <Route path="/train" element={<GeneralCalculator mode="train" />} />
                <Route path="/plane" element={<GeneralCalculator mode="plane" />} />
                <Route path="/ship" element={<GeneralCalculator mode="ship" />} />
            </Routes>
        </Router>
    );
}

export default App;
