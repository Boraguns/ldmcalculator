import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import LogoLoop from './LogoLoop';

/**
 * Infinite, auto-scrolling strip of customer/partner logos shown on the home
 * page above the transport buttons. Logos are pulled from the same admin-managed
 * "References" list (GET /api/public/references) and rendered in their saved
 * order (sort_order ASC). The fade colour is tuned to the light-grey home
 * background image so the loop blends seamlessly into the hero.
 */
const ReferenceMarquee = ({ isDesktop = true, fadeColor = '#ececec' }) => {
    const [items, setItems] = useState(null);

    useEffect(() => {
        let cancelled = false;
        api('/api/public/references', { auth: false })
            .then((j) => { if (!cancelled) setItems(j.items || []); })
            .catch(() => { if (!cancelled) setItems([]); });
        return () => { cancelled = true; };
    }, []);

    // Only companies that actually have a logo image make sense in a logo loop.
    const logos = (items || [])
        .filter((r) => r.logo_url)
        .map((r) => ({
            src: r.logo_url,
            alt: r.name,
            title: r.name,
            href: r.website || undefined,
        }));

    // Render nothing until loaded / when there are no logos (no empty gap).
    if (!logos.length) return null;

    return (
        <div
            style={{
                width: '100%',
                maxWidth: isDesktop ? 980 : 420,
                margin: isDesktop ? '0 auto 36px' : '0 auto 24px',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <LogoLoop
                logos={logos}
                speed={55}
                direction="left"
                logoHeight={isDesktop ? 46 : 34}
                gap={isDesktop ? 64 : 40}
                pauseOnHover
                scaleOnHover
                fadeOut
                fadeOutColor={fadeColor}
                ariaLabel="References"
            />
        </div>
    );
};

export default ReferenceMarquee;
