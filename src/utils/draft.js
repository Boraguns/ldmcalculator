// Lightweight form-draft persistence (localStorage).
//
// Used so a visitor who fills in the truck wizard or a document (CMR / invoice
// / packing list) and then gets bounced to login/register does NOT lose their
// work: the form is auto-saved as they type and restored when they come back.
//
// Drafts carry a timestamp and expire after a TTL so stale data from days ago
// doesn't silently reappear.

const PREFIX = 'ldm_draft_';
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24h

export const saveDraft = (key, data) => {
    try {
        localStorage.setItem(PREFIX + key, JSON.stringify({ _ts: Date.now(), v: data }));
    } catch { /* quota / private mode — drafts are best-effort */ }
};

export const loadDraft = (key, ttl = DEFAULT_TTL) => {
    try {
        const raw = localStorage.getItem(PREFIX + key);
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (!o || typeof o !== 'object') return null;
        if (ttl && o._ts && (Date.now() - o._ts) > ttl) {
            localStorage.removeItem(PREFIX + key);
            return null;
        }
        return o.v ?? null;
    } catch {
        return null;
    }
};

export const clearDraft = (key) => {
    try { localStorage.removeItem(PREFIX + key); } catch { /* noop */ }
};
