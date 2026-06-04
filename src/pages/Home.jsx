import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useT, LanguageSwitcher } from '../i18n/LanguageContext';
import { useSiteAsset } from '../hooks/useSiteAssets';
import usePageMeta from '../hooks/usePageMeta';
import ToolsMenu from '../components/ToolsMenu';
import AccountMenu from '../components/AccountMenu';
import ReferenceMarquee from '../components/ReferenceMarquee';

const Home = () => {
    const navigate = useNavigate();
    const { t, lang } = useT();
    usePageMeta({
        title: 'LDMCalculator — Free 3D Cargo Loading & LDM Calculator for Trucks, Containers, Planes & Ships',
        description: 'Plan truck, container, air ULD and sea container loads in 3D. Calculate LDM (loading meters), volume efficiency and weight distribution in seconds — free, no signup.',
        canonical: 'https://ldmcalculator.com/'
    });
    const homeLogo  = useSiteAsset('home_logo',  '/src/ldm-calculator-logo.png');
    const homeBg    = useSiteAsset('home_bg',    '/src/bg.jpg');
    const mobileBg  = useSiteAsset('home_bg_mobile', '/src/mobil-bg.jpg');
    const bgTruck   = useSiteAsset('home_bg_truck', '/src/bg1.jpg');
    const bgTrain   = useSiteAsset('home_bg_train', '/src/bg2.jpg');
    const bgPlane   = useSiteAsset('home_bg_plane', '/src/bg3.jpg');
    const bgShip    = useSiteAsset('home_bg_ship',  '/src/bg4.jpg');
    const thumbTruck = useSiteAsset('home_thumb_truck', '/src/tir.png');
    const thumbTrain = useSiteAsset('home_thumb_train', '/src/tren.png');
    const thumbPlane = useSiteAsset('home_thumb_plane', '/src/ucak.png');
    const thumbShip  = useSiteAsset('home_thumb_ship',  '/src/gemi.png');
    const [hoveredSection, setHoveredSection] = useState(null);
    const [isDesktop, setIsDesktop] = useState(true);
    // G1: vertically align the top-right button row's top edge with the logo's
    // top edge. Both share the hero wrapper as their offset parent, so we copy
    // the logo's measured offsetTop onto the button row (desktop only — on
    // mobile the row keeps its small fixed inset so it clears the logo above it).
    const logoRef = useRef(null);
    const [headerTop, setHeaderTop] = useState(16);

    const sections = [
        { id: 'truck', path: '/truck', img: thumbTruck, bg: bgTruck },
        { id: 'train', path: '/train', img: thumbTrain, bg: bgTrain },
        { id: 'plane', path: '/plane', img: thumbPlane, bg: bgPlane },
        { id: 'ship',  path: '/ship',  img: thumbShip,  bg: bgShip  }
    ];

    // Allow native body scroll on the Home route only — global CSS pins body
    // to overflow:hidden / height:100vh for the 3D viewer pages, but the home
    // page is content-heavy (hero + SEO + footer) and needs to scroll natively.
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        const prevOverflowX = document.body.style.overflowX;
        const prevHeight = document.body.style.height;
        const prevHtmlOverflow = document.documentElement.style.overflow;
        const prevHtmlOverflowX = document.documentElement.style.overflowX;
        // Vertical scroll only — never horizontal (100vw + scrollbar would
        // otherwise let the page drift sideways).
        document.body.style.overflow = 'auto';
        document.body.style.overflowX = 'hidden';
        document.body.style.height = 'auto';
        document.documentElement.style.overflow = 'auto';
        document.documentElement.style.overflowX = 'hidden';
        return () => {
            document.body.style.overflow = prevOverflow;
            document.body.style.overflowX = prevOverflowX;
            document.body.style.height = prevHeight;
            document.documentElement.style.overflow = prevHtmlOverflow;
            document.documentElement.style.overflowX = prevHtmlOverflowX;
        };
    }, []);

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

    // Measure the logo's top offset and mirror it onto the button row so the
    // buttons sit at the same height as the top of the logo (desktop). Runs on
    // mount, on every resize, and whenever the desktop flag flips (the logo
    // size/margins differ between layouts).
    useEffect(() => {
        const align = () => {
            if (isDesktop && logoRef.current) {
                setHeaderTop(logoRef.current.offsetTop);
            } else {
                setHeaderTop(16);
            }
        };
        align();
        window.addEventListener('resize', align);
        return () => window.removeEventListener('resize', align);
    }, [isDesktop]);

    const [adminFaq, setAdminFaq] = useState({});
    useEffect(() => {
        let cancelled = false;
        fetch('/api/public/faq')
            .then(r => r.ok ? r.json() : null)
            .then(j => { if (j?.faq && !cancelled) setAdminFaq(j.faq); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    // Inject JSON-LD structured data — also picks up admin-managed FAQ
    // overrides for the current language (so SEO crawlers see the same
    // questions visible on screen).
    useEffect(() => {
        const adminList = adminFaq[lang];
        const faqArr = (Array.isArray(adminList) && adminList.length > 0)
            ? adminList
            : (Array.isArray(t('home.seo.faq')) ? t('home.seo.faq') : []);
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
    }, [lang, t, adminFaq]);

    const faqItems = (() => {
        const adminList = adminFaq[lang];
        if (Array.isArray(adminList) && adminList.length > 0) return adminList;
        const f = t('home.seo.faq');
        return Array.isArray(f) ? f : [];
    })();

    return (
        <div style={{
            width: '100%',
            minHeight: '100vh',
            backgroundColor: '#000',
            position: 'relative',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            // On desktop keep the hero flush to the top so the background image
            // fully covers the viewport (no black strip above it). Mobile keeps
            // the safe-area + small offset so the switcher row isn't clipped.
            paddingTop: isDesktop ? 'env(safe-area-inset-top, 0px)' : 'calc(env(safe-area-inset-top, 0px) + 3vh)',
        }}>
            {/* Hero wrapper — full viewport height on desktop so the background
                image always covers the whole screen (100vh). */}
            <div style={{
                width: '100%',
                minHeight: isDesktop ? '100vh' : 'auto',
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center'
            }}>
            {/* Language switcher top-right (smaller height on mobile so it
                doesn't crowd the centered logo) */}
            <div style={{ position: 'absolute', top: headerTop, right: 16, zIndex: 200, display: 'flex', gap: '10px', alignItems: 'center' }}>
                <ToolsMenu height={isDesktop ? 44 : 36} compact={!isDesktop} />
                <AccountMenu height={isDesktop ? 44 : 36} compact={!isDesktop} />
                <LanguageSwitcher height={isDesktop ? 44 : 36} compact={!isDesktop} />
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
                        backgroundImage: `url(${homeBg})`,
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
                    backgroundImage: `url(${mobileBg})`,
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
                    ref={logoRef}
                    src={homeLogo}
                    alt="LDM Logo"
                    className="home-logo"
                    style={{
                        width: isDesktop ? '320px' : '180px',
                        height: 'auto',
                        // On mobile push the logo below the switcher row so they
                        // don't overlap when the switcher widens with longer
                        // language labels (e.g. "Русский").
                        marginTop: isDesktop ? 0 : '50px',
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

                {/* Auto-scrolling strip of partner/customer reference logos,
                    pulled from the admin "References" list (in sort order). */}
                <ReferenceMarquee isDesktop={isDesktop} fadeColor="#ececec" />

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

            {/* SEO + Usage info section — light, logistics-themed band */}
            <section
                aria-label={t('home.seo.heading')}
                style={{
                    position: 'relative',
                    zIndex: 100,
                    width: '100%',
                    backgroundColor: '#f0f0f0',
                    backgroundImage: 'url(/wide-bg.jpg)',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right bottom',
                    backgroundSize: 'contain',
                    borderTop: '1px solid #e2e8f0',
                    padding: isDesktop ? '64px 32px 72px' : '44px 18px 56px',
                }}
            >
                <article style={{ maxWidth: 1060, margin: '0 auto', color: '#334155', lineHeight: 1.7, fontSize: '1rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: isDesktop ? 44 : 32 }}>
                        <span style={{
                            display: 'inline-block', fontSize: '0.72rem', fontWeight: 800,
                            letterSpacing: '.09em', textTransform: 'uppercase', color: '#2563eb',
                            background: '#e0ecff', padding: '5px 14px', borderRadius: 999, marginBottom: 16,
                        }}>
                            {t('home.seo.eyebrow')}
                        </span>
                        <h2 style={{ color: '#0f172a', fontSize: isDesktop ? '1.9rem' : '1.4rem', margin: '0 0 12px', fontWeight: 800, lineHeight: 1.25 }}>
                            {t('home.seo.heading')}
                        </h2>
                        <p style={{ color: '#475569', maxWidth: 720, margin: '0 auto', fontSize: '1.02rem' }}>{t('home.seo.intro')}</p>
                    </div>

                    {/* How / Why as two clean cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 18, marginBottom: isDesktop ? 52 : 38 }}>
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '22px 24px', boxShadow: '0 1px 3px rgba(15,23,42,0.05)' }}>
                            <h3 style={{ color: '#0f172a', margin: '0 0 14px', fontSize: '1.12rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span aria-hidden="true" style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, background: '#e0ecff', color: '#2563eb', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem' }}>📦</span>
                                {t('home.seo.howTitle')}
                            </h3>
                            <ol style={{ color: '#475569', paddingLeft: 20, margin: 0 }}>
                                <li style={{ marginBottom: 7 }}>{t('home.seo.how1')}</li>
                                <li style={{ marginBottom: 7 }}>{t('home.seo.how2')}</li>
                                <li>{t('home.seo.how3')}</li>
                            </ol>
                        </div>
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '22px 24px', boxShadow: '0 1px 3px rgba(15,23,42,0.05)' }}>
                            <h3 style={{ color: '#0f172a', margin: '0 0 14px', fontSize: '1.12rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span aria-hidden="true" style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, background: '#e0ecff', color: '#2563eb', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem' }}>🚚</span>
                                {t('home.seo.whyTitle')}
                            </h3>
                            <p style={{ color: '#475569', margin: 0 }}>{t('home.seo.whyBody')}</p>
                        </div>
                    </div>

                    {/* FAQ */}
                    <h3 style={{ color: '#0f172a', fontSize: isDesktop ? '1.5rem' : '1.25rem', textAlign: 'center', margin: '0 0 22px', fontWeight: 800 }}>{t('home.seo.faqTitle')}</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 auto', maxWidth: 820 }}>
                        {faqItems.map((item, i) => (
                            <li key={i} style={{ marginBottom: 12 }}>
                                <details style={{
                                    background: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 12,
                                    padding: '14px 18px',
                                    boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
                                }}>
                                    <summary style={{ cursor: 'pointer', color: '#0f172a', fontWeight: 600 }}>{item.q}</summary>
                                    <p style={{ marginTop: 10, color: '#475569', marginBottom: 0 }}>{item.a}</p>
                                </details>
                            </li>
                        ))}
                    </ul>
                </article>
            </section>

            {/* SITE FOOTER with legal/about/contact links */}
            <footer style={{
                position: 'relative',
                zIndex: 100,
                width: '100%',
                background: 'rgba(15, 23, 42, 0.92)',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                padding: isDesktop ? '40px 32px 24px' : '28px 18px 16px',
                color: '#cbd5e1',
                marginTop: 'auto'
            }}>
                <div style={{
                    maxWidth: '1200px', margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : '1fr 1fr',
                    gap: '20px',
                    fontSize: '0.88rem'
                }}>
                    <div>
                        <h4 style={{ color: '#f8fafc', margin: '0 0 10px', fontSize: '0.95rem' }}>LDMCalculator</h4>
                        <p style={{ margin: 0, lineHeight: 1.5, color: '#94a3b8' }}>{t('home.seo.intro')?.toString().slice(0, 120)}…</p>
                    </div>
                    <div>
                        <h4 style={{ color: '#f8fafc', margin: '0 0 10px', fontSize: '0.95rem' }}>{t('footer.company')}</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 2 }}>
                            <li><Link to="/pricing" style={{ color: '#cbd5e1', textDecoration: 'none' }}>{t('footer.pricing')}</Link></li>
                            <li><Link to="/references" style={{ color: '#cbd5e1', textDecoration: 'none' }}>{t('footer.references')}</Link></li>
                            <li><Link to="/about" style={{ color: '#cbd5e1', textDecoration: 'none' }}>{t('footer.about')}</Link></li>
                            <li><Link to="/contact" style={{ color: '#cbd5e1', textDecoration: 'none' }}>{t('footer.contact')}</Link></li>
                            <li><Link to="/advertise" style={{ color: '#cbd5e1', textDecoration: 'none' }}>{t('footer.advertise')}</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 style={{ color: '#f8fafc', margin: '0 0 10px', fontSize: '0.95rem' }}>{t('footer.legal')}</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 2 }}>
                            <li><Link to="/terms"   style={{ color: '#cbd5e1', textDecoration: 'none' }}>{t('footer.terms')}</Link></li>
                            <li><Link to="/privacy" style={{ color: '#cbd5e1', textDecoration: 'none' }}>{t('footer.privacy')}</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 style={{ color: '#f8fafc', margin: '0 0 10px', fontSize: '0.95rem' }}>{t('footer.reach')}</h4>
                        <p style={{ margin: 0, lineHeight: 1.6 }}>
                            <a href="mailto:info@ldmcalculator.com" style={{ color: '#60a5fa', textDecoration: 'none' }}>info@ldmcalculator.com</a>
                        </p>
                    </div>
                </div>
                <div style={{
                    maxWidth: '1200px', margin: '20px auto 0',
                    paddingTop: '14px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    fontSize: '0.75rem', color: '#64748b',
                    display: 'flex', flexWrap: 'wrap', gap: '8px',
                    justifyContent: 'space-between'
                }}>
                    <span>{t('home.footer', { year: new Date().getFullYear() })} <a style={{ color: '#64748b' }} href="https://fosil.io/" target="_blank" rel="noreferrer">fosil.io</a></span>
                    <Link to="/admin" style={{ color: '#475569', textDecoration: 'none' }}>{t('footer.admin')}</Link>
                </div>
            </footer>
            <div className="home-footer" style={{
                display: 'none', // legacy overlay no longer used; kept hidden to avoid layout shift
                position: 'relative',
                width: '100%',
                textAlign: 'center',
                color: '#1b1b1b',
                fontSize: isDesktop ? '13px' : '11px',
                fontWeight: '600',
                zIndex: 100,
                padding: '20px 10px calc(env(safe-area-inset-bottom, 0px) + 20px)',
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
