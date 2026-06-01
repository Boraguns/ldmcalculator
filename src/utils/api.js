// Thin fetch wrapper for the end-user (non-admin) API. Sends the JWT (from
// localStorage, mirroring the httpOnly cookie set by the server), the device
// fingerprint header, and always includes credentials so the ldm_token /
// ldm_aid cookies travel with the request.
import { getFingerprint } from './fingerprint';

export const USER_TOKEN_KEY = 'ldm_user_token';

export const getToken = () => {
    try { return localStorage.getItem(USER_TOKEN_KEY) || ''; } catch { return ''; }
};
export const setToken = (t) => {
    try { if (t) localStorage.setItem(USER_TOKEN_KEY, t); else localStorage.removeItem(USER_TOKEN_KEY); } catch { /* noop */ }
};

export async function api(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
    const h = { 'Content-Type': 'application/json', 'X-Fingerprint': getFingerprint(), ...headers };
    if (auth) {
        const tok = getToken();
        if (tok) h.Authorization = `Bearer ${tok}`;
    }
    const res = await fetch(path, {
        method,
        headers: h,
        credentials: 'include',
        body: body != null ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch { /* non-JSON */ }
    if (!res.ok) {
        const err = new Error((data && data.error) || `http_${res.status}`);
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
}
