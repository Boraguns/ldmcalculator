// Lightweight, dependency-free device fingerprint. Not meant to be
// cryptographically strong — just one more signal (alongside IP + signed
// cookie, combined server-side) to make casual free-tier limit evasion harder.
// The raw string is sent to the server, which hashes it before storage.

let _cached = null;

const hash = (str) => {
    // FNV-1a 32-bit → hex. Stable across reloads for the same browser/device.
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
};

const canvasSignal = () => {
    try {
        const c = document.createElement('canvas');
        const ctx = c.getContext('2d');
        if (!ctx) return '';
        ctx.textBaseline = 'top';
        ctx.font = "14px 'Arial'";
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('LDM Calc ✨', 2, 15);
        ctx.fillStyle = 'rgba(102,204,0,0.7)';
        ctx.fillText('LDM Calc ✨', 4, 17);
        return c.toDataURL();
    } catch { return ''; }
};

export function getFingerprint() {
    if (_cached) return _cached;
    try {
        const nav = window.navigator || {};
        const scr = window.screen || {};
        const parts = [
            nav.userAgent || '',
            nav.language || '',
            (nav.languages || []).join(','),
            nav.platform || '',
            nav.hardwareConcurrency || '',
            nav.deviceMemory || '',
            scr.width + 'x' + scr.height + 'x' + (scr.colorDepth || ''),
            new Date().getTimezoneOffset(),
            Intl.DateTimeFormat().resolvedOptions().timeZone || '',
            canvasSignal(),
        ];
        _cached = hash(parts.join('|'));
    } catch {
        _cached = '';
    }
    return _cached;
}
