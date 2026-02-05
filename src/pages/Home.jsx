import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();
    const [hoveredSection, setHoveredSection] = useState(null);
    const [isDesktop, setIsDesktop] = useState(true);

    const sections = [
        { id: 'truck', label: 'Tır Dorse Yükü Hesapla', path: '/truck', img: '/src/tir.png', bg: '/src/bg1.jpg', desc: 'Kara yolu taşımacılığı için optimize edilmiş yükleme.' },
        { id: 'train', label: 'Tren Konteyner Yükü Hesapla', path: '/train', img: '/src/tren.png', bg: '/src/bg2.jpg', desc: 'Demir yolu konteyner yerleşimi ve ağırlık dengesi.' },
        { id: 'plane', label: 'Uçak Kargo Yükü Hesapla', path: '/plane', img: '/src/ucak.png', bg: '/src/bg3.jpg', desc: 'Hava yolu kargo kapasite ve hacim hesaplayıcı.' },
        { id: 'ship', label: 'Gemi Konteyner Yükü Hesapla', path: '/ship', img: '/src/gemi.png', bg: '/src/bg4.jpg', desc: 'Deniz yolu lojistiği için konteyner istifleme.' }
    ];

    useEffect(() => {
        const checkDevice = () => {
            const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
            setIsDesktop(hasFinePointer && window.innerWidth > 1024);
        };

        checkDevice();
        window.addEventListener('resize', checkDevice);

        // Preload only on desktop
        if (window.matchMedia('(pointer: fine)').matches && window.innerWidth > 1024) {
            const images = ['/src/bg.jpg', ...sections.map(s => s.bg)];
            images.forEach(src => {
                const img = new Image();
                img.src = src;
            });
        }

        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            backgroundColor: '#000',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3vh)', // Handle notched devices
        }}>
            {/* 
                DESKTOP BACKGROUND LAYERS 
            */}
            {isDesktop ? (
                <>
                    {/* Default Background */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundImage: 'url(/src/bg.jpg)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        zIndex: hoveredSection ? 1 : 10,
                        display: 'block'
                    }} />

                    {/* Hover Backgrounds */}
                    {sections.map(section => (
                        <div
                            key={`bg-${section.id}`}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                backgroundImage: `url(${section.bg})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                zIndex: hoveredSection === section.id ? 20 : 5,
                                display: 'block'
                            }}
                        />
                    ))}
                </>
            ) : (
                /* MOBILE BACKGROUND - FIXED */
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundImage: 'url(/src/mobil-bg.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    zIndex: 1
                }} />
            )}

            <div style={{
                position: 'relative',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0px',
                maxWidth: '1200px',
                width: '100%',
                padding: '1.5rem',
                margin: '0 auto'
            }}>
                <img
                    src="/src/ldm-calculator-logo.png"
                    alt="LDM Logo"
                    className="home-logo"
                    style={{
                        width: isDesktop ? '320px' : '200px',
                        height: 'auto',
                        marginBottom: isDesktop ? '80px' : '30px',
                        objectFit: 'contain'
                    }}
                />

                <h1 className="home-title" style={{
                    color: '#1a1a1a',
                    fontSize: isDesktop ? '2.2rem' : '1.4rem',
                    fontWeight: '800',
                    textAlign: 'center',
                    marginBottom: isDesktop ? '40px' : '30px',
                    padding: '0 10px',
                    lineHeight: '1.2'
                }}>
                    Yük planlaması için ihtiyaç duyacağınız tüm hesaplamalar
                </h1>

                <div className="home-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : '1fr',
                    gap: isDesktop ? '20px' : '12px',
                    width: '100%',
                    maxWidth: isDesktop ? 'none' : '400px',
                    minHeight: isDesktop ? '220px' : 'auto'
                }}>
                    {sections.map(section => (
                        <button
                            key={section.id}
                            className="ai-btn"
                            onClick={() => navigate(section.path)}
                            onMouseEnter={() => isDesktop && setHoveredSection(section.id)}
                            onMouseLeave={() => isDesktop && setHoveredSection(null)}
                            style={{ height: 'auto', padding: '2px' }}
                        >
                            <div className="ai-btn-inner" style={{
                                flexDirection: isDesktop ? 'column' : 'row',
                                padding: isDesktop ? '30px 20px' : '15px 12px',
                                height: '100%',
                                gap: '12px',
                                textAlign: isDesktop ? 'center' : 'left',
                                alignItems: 'center',
                                justifyContent: isDesktop ? 'center' : 'flex-start'
                            }}>
                                <img src={section.img} alt={section.label} style={{ height: isDesktop ? '48px' : '32px', width: 'auto', objectFit: 'contain' }} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <h3 style={{ margin: '0', color: 'white', fontSize: isDesktop ? '1.1rem' : '0.9rem' }}>{section.label}</h3>
                                    {isDesktop && <p style={{ margin: '0', color: '#ffffff', fontSize: '0.8rem', lineHeight: '1.4' }}>{section.desc}</p>}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* COPYRIGHT FOOTER */}
            <div className="home-footer" style={{
                position: 'absolute',
                bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
                width: '100%',
                textAlign: 'center',
                color: '#1b1b1b',
                fontSize: isDesktop ? '13px' : '11px',
                fontWeight: '600',
                zIndex: 100,
                padding: '0 10px'
            }}>
                © {new Date().getFullYear()} LDMCalculator.com - All rights reserved. | Designed by <a style={{ color: '#1b1b1b' }} href="https://fosil.io/" target="_blank">fosil.io</a>
            </div>
        </div>
    );
};

export default Home;
