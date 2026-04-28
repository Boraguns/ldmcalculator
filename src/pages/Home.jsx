import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT, LanguageSwitcher } from '../i18n/LanguageContext';

const Home = () => {
    const navigate = useNavigate();
    const { t, lang } = useT();
    const [hoveredSection, setHoveredSection] = useState(null);
    const [isDesktop, setIsDesktop] = useState(true);

    const sections = [
        { id: 'truck', path: '/truck', img: '/src/tir.png', bg: '/src/bg1.jpg' },
        { id: 'train', path: '/train', img: '/src/tren.png', bg: '/src/bg2.jpg' },
        { id: 'plane', path: '/plane', img: '/src/ucak.png', bg: '/src/bg3.jpg' },
        { id: 'ship', path: '/ship', img: '/src/gemi.png', bg: '/src/bg4.jpg' }
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

    // Inject JSON-LD structured data
    useEffect(() => {
        const faqRaw = t('home.seo.faq');
        const faqArr = Array.isArray(faqRaw) ? faqRaw : [];
        const ld = [
            {
                '@context': 'https://schema.org',
                '@type': 'WebApplication',
                name: 'LDMCalculator',
                url: 'https://ldmcalculator.com/',
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'Any (browser-based)',
                description: t('home.seo.intro'),
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
            },
            {
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: faqArr.map(item => ({
                    '@type': 'Question',
                    name: item.q,
                    acceptedAnswer: { '@type': 'Answer', text: item.a }
                }))
            }
        ];
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(ld);
        script.setAttribute('data-ldm-jsonld', '1');
        document.head.appendChild(script);
        return () => {
            if (script.parentNode) script.parentNode.removeChild(script);
        };
    }, [lang, t]);

    const faqItems = (() => {
        const f = t('home.seo.faq');
        return Array.isArray(f) ? f : [];
    })();

    return (
        <div style={{
            width: '100vw',
            minHeight: '100vh',
            backgroundColor: '#000',
            position: 'relative',
            overflowX: 'hidden',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3vh)',
        }}>
            {/* Hero wrapper keeps the original full-viewport hero on top */}
            <div style={{
                width: '100%',
                minHeight: isDesktop ? '100vh' : 'auto',
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center'
            }}>
            {/* Language switcher top-right */}
            <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 200 }}>
                <LanguageSwitcher />
            </div>
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
                    {t('home.title')}
                </h1>

                <div className="home-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : '1fr',
                    gap: isDesktop ? '20px' : '12px',
                    width: '100%',
                    maxWidth: isDesktop ? 'none' : '400px',
                    minHeight: isDesktop ? '220px' : 'auto'
                }}>
                    {sections.map(section => {
                        const isDisabled = section.id !== 'truck';
                        const label = t(`home.${section.id}.label`);
                        const desc = t(`home.${section.id}.desc`);
                        return (
                            <button
                                key={section.id}
                                className="ai-btn"
                                onClick={() => !isDisabled && navigate(section.path)}
                                onMouseEnter={() => isDesktop && !isDisabled && setHoveredSection(section.id)}
                                onMouseLeave={() => isDesktop && setHoveredSection(null)}
                                disabled={isDisabled}
                                style={{
                                    height: 'auto',
                                    padding: '2px',
                                    opacity: isDisabled ? 0.6 : 1,
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                    position: 'relative',
                                    filter: isDisabled ? 'grayscale(0.8)' : 'none'
                                }}
                            >
                                {isDisabled && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '10px',
                                        background: '#ef4444',
                                        color: 'white',
                                        fontSize: '0.65rem',
                                        fontWeight: 'bold',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        zIndex: 10,
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                    }}>
                                        {t('home.comingSoon')}
                                    </div>
                                )}
                                <div className="ai-btn-inner" style={{
                                    flexDirection: isDesktop ? 'column' : 'row',
                                    padding: isDesktop
                                        ? (isDisabled ? '30px 20px 30px 20px' : '30px 20px')
                                        : (isDisabled ? '15px 95px 15px 12px' : '15px 12px'),
                                    height: '100%',
                                    gap: '12px',
                                    textAlign: isDesktop ? 'center' : 'left',
                                    alignItems: 'center',
                                    justifyContent: isDesktop ? 'center' : 'flex-start'
                                }}>
                                    <img src={section.img} alt={label} style={{ height: isDesktop ? '48px' : '32px', width: 'auto', objectFit: 'contain' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <h3 style={{ margin: '0', color: 'white', fontSize: isDesktop ? '1.1rem' : '0.9rem' }}>{label}</h3>
                                        {isDesktop && <p style={{ margin: '0', color: '#ffffff', fontSize: '0.8rem', lineHeight: '1.4' }}>{desc}</p>}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
            </div>

            {/* SEO + Usage info section */}
            <section
                aria-label={t('home.seo.heading')}
                style={{
                    position: 'relative',
                    zIndex: 100,
                    width: '100%',
                    maxWidth: '1200px',
                    margin: '0 auto',
                    padding: isDesktop ? '60px 32px 80px' : '40px 20px 80px',
                    color: '#e2e8f0'
                }}
            >
                <article style={{
                    background: 'rgba(15, 23, 42, 0.78)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px',
                    padding: isDesktop ? '40px 44px' : '24px 20px',
                    backdropFilter: 'blur(6px)',
                    lineHeight: 1.65,
                    fontSize: '0.98rem'
                }}>
                    <h2 style={{ color: '#f8fafc', fontSize: isDesktop ? '1.8rem' : '1.35rem', marginTop: 0 }}>
                        {t('home.seo.heading')}
                    </h2>
                    <p style={{ color: '#cbd5e1' }}>{t('home.seo.intro')}</p>

                    <h3 style={{ color: '#f8fafc', marginTop: 32, fontSize: '1.2rem' }}>{t('home.seo.howTitle')}</h3>
                    <ol style={{ color: '#cbd5e1', paddingLeft: 22 }}>
                        <li>{t('home.seo.how1')}</li>
                        <li>{t('home.seo.how2')}</li>
                        <li>{t('home.seo.how3')}</li>
                    </ol>

                    <h3 style={{ color: '#f8fafc', marginTop: 32, fontSize: '1.2rem' }}>{t('home.seo.whyTitle')}</h3>
                    <p style={{ color: '#cbd5e1' }}>{t('home.seo.whyBody')}</p>

                    <h3 style={{ color: '#f8fafc', marginTop: 32, fontSize: '1.2rem' }}>{t('home.seo.faqTitle')}</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {faqItems.map((item, i) => (
                            <li key={i} style={{ marginBottom: 10 }}>
                                <details style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 10,
                                    padding: '12px 16px'
                                }}>
                                    <summary style={{ cursor: 'pointer', color: '#f1f5f9', fontWeight: 600 }}>{item.q}</summary>
                                    <p style={{ marginTop: 10, color: '#cbd5e1', marginBottom: 0 }}>{item.a}</p>
                                </details>
                            </li>
                        ))}
                    </ul>
                </article>
            </section>

            {/* COPYRIGHT FOOTER */}
            <div className="home-footer" style={{
                position: 'fixed',
                bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
                width: '100%',
                textAlign: 'center',
                color: '#1b1b1b',
                fontSize: isDesktop ? '13px' : '11px',
                fontWeight: '600',
                zIndex: 100,
                padding: '0 10px',
                pointerEvents: 'none'
            }}>
                <span style={{ pointerEvents: 'auto' }}>
                    {t('home.footer', { year: new Date().getFullYear() })} <a style={{ color: '#1b1b1b' }} href="https://fosil.io/" target="_blank" rel="noreferrer">fosil.io</a>
                </span>
            </div>
        </div>
    );
};

export default Home;
