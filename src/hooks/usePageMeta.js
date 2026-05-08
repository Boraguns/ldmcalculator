// Updates document.title and meta tags on route change. SPA pages must do
// this manually so Google indexes per-route titles instead of falling back
// to the static <title> in index.html.
import { useEffect } from 'react';

const setMeta = (selector, attrName, value) => {
    let el = document.head.querySelector(selector);
    if (!el) {
        el = document.createElement('meta');
        const [, key, val] = selector.match(/\[(\w+)="([^"]+)"\]/) || [];
        if (key && val) el.setAttribute(key, val);
        document.head.appendChild(el);
    }
    el.setAttribute(attrName, value);
};

const setLink = (rel, href) => {
    let el = document.head.querySelector(`link[rel="${rel}"]`);
    if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
    }
    el.setAttribute('href', href);
};

/**
 * Set per-route SEO metadata.
 * @param {object} opts
 * @param {string} opts.title          Full <title> text. Branded by convention.
 * @param {string} [opts.description]  meta description (recommended ≤160 chars)
 * @param {string} [opts.canonical]    absolute canonical URL for this route
 */
export function usePageMeta({ title, description, canonical }) {
    useEffect(() => {
        if (title) document.title = title;
        if (description) {
            setMeta('meta[name="description"]', 'content', description);
            setMeta('meta[property="og:description"]', 'content', description);
            setMeta('meta[name="twitter:description"]', 'content', description);
        }
        if (title) {
            setMeta('meta[property="og:title"]', 'content', title);
            setMeta('meta[name="twitter:title"]', 'content', title);
        }
        if (canonical) {
            setLink('canonical', canonical);
            setMeta('meta[property="og:url"]', 'content', canonical);
        }
    }, [title, description, canonical]);
}

export default usePageMeta;
