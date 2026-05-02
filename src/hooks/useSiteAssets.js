// Tiny shared store for /api/public/config so we hit the network exactly
// once across the whole app. Components subscribe with useSiteAsset(key, fb)
// and re-render when the config arrives.
import { useEffect, useState } from 'react';

let cache = null;          // { banner, companies, assets }
let pending = null;        // in-flight Promise so concurrent callers share it
const subscribers = new Set();

const load = () => {
    if (cache) return Promise.resolve(cache);
    if (pending) return pending;
    pending = fetch('/api/public/config')
        .then(r => r.ok ? r.json() : null)
        .then(j => {
            cache = j || { banner: {}, companies: {}, assets: {} };
            for (const cb of subscribers) cb(cache);
            return cache;
        })
        .catch(() => {
            cache = { banner: {}, companies: {}, assets: {} };
            for (const cb of subscribers) cb(cache);
            return cache;
        })
        .finally(() => { pending = null; });
    return pending;
};

export function useSiteAsset(key, fallback = '') {
    const [, force] = useState(0);
    useEffect(() => {
        const cb = () => force(x => x + 1);
        subscribers.add(cb);
        load();
        return () => { subscribers.delete(cb); };
    }, []);
    return (cache?.assets?.[key]) || fallback;
}

export function useSiteConfig() {
    const [, force] = useState(0);
    useEffect(() => {
        const cb = () => force(x => x + 1);
        subscribers.add(cb);
        load();
        return () => { subscribers.delete(cb); };
    }, []);
    return cache || { banner: {}, companies: {}, assets: {} };
}
