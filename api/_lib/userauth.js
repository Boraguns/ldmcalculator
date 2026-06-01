// End-user authentication helpers — deliberately separate from the admin auth
// in _lib/db.js so an admin token can never authenticate as an end-user (or
// vice-versa). End-user tokens carry `typ: 'user'`.
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sql, clientIp } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const USER_JWT_EXP = '30d';
const COOKIE_SECRET = process.env.COOKIE_SECRET || JWT_SECRET;

// --- Passwords -------------------------------------------------------------
export const hashPassword = (pw) => bcrypt.hash(pw, 10);
export const comparePassword = (pw, hash) => bcrypt.compare(pw, hash);

// --- Tokens ----------------------------------------------------------------
export const signUserToken = (payload) =>
    jwt.sign({ ...payload, typ: 'user' }, JWT_SECRET, { expiresIn: USER_JWT_EXP });

export const verifyUserToken = (token) => {
    try {
        const p = jwt.verify(token, JWT_SECRET);
        return p && p.typ === 'user' ? p : null;
    } catch { return null; }
};

// Random URL-safe token for email verification / password reset / invites.
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

// --- Cookies ---------------------------------------------------------------
export const parseCookies = (req) => {
    const header = req.headers?.cookie || '';
    const out = {};
    header.split(';').forEach((part) => {
        const i = part.indexOf('=');
        if (i === -1) return;
        const k = part.slice(0, i).trim();
        const v = part.slice(i + 1).trim();
        if (k) out[k] = decodeURIComponent(v);
    });
    return out;
};

export const serializeCookie = (name, value, opts = {}) => {
    const segs = [`${name}=${encodeURIComponent(value)}`];
    segs.push(`Path=${opts.path || '/'}`);
    if (opts.maxAge != null) segs.push(`Max-Age=${opts.maxAge}`);
    if (opts.httpOnly !== false) segs.push('HttpOnly');
    segs.push(`SameSite=${opts.sameSite || 'Lax'}`);
    if (opts.secure !== false) segs.push('Secure');
    return segs.join('; ');
};

export const appendCookie = (res, cookieStr) => {
    const prev = res.getHeader('Set-Cookie');
    if (!prev) res.setHeader('Set-Cookie', cookieStr);
    else res.setHeader('Set-Cookie', Array.isArray(prev) ? [...prev, cookieStr] : [prev, cookieStr]);
};

// --- Anonymous device identity (for free-tier metering) --------------------
// A stable, signed id stored in an httpOnly cookie. Signed so a client can't
// forge / rotate it freely; combined server-side with IP + fingerprint.
const sign = (val) => crypto.createHmac('sha256', COOKIE_SECRET).update(val).digest('hex').slice(0, 16);

export const getOrSetAnonId = (req, res) => {
    const cookies = parseCookies(req);
    const existing = cookies.ldm_aid;
    if (existing) {
        const [id, sig] = existing.split('.');
        if (id && sig && sign(id) === sig) return id;
    }
    const id = randomToken(12);
    const value = `${id}.${sign(id)}`;
    appendCookie(res, serializeCookie('ldm_aid', value, { maxAge: 60 * 60 * 24 * 365 }));
    return id;
};

// Hash a raw fingerprint/IP so we don't store raw PII-ish values verbatim.
export const hashId = (val) =>
    crypto.createHmac('sha256', COOKIE_SECRET).update(String(val || '')).digest('hex').slice(0, 32);

// --- Request → authenticated user ------------------------------------------
// Accepts either `Authorization: Bearer <jwt>` or the `ldm_token` cookie.
export const getTokenPayload = (req) => {
    const auth = req.headers?.authorization || req.headers?.Authorization || '';
    const m = /^Bearer\s+(.+)$/i.exec(auth);
    if (m) return verifyUserToken(m[1]);
    const cookies = parseCookies(req);
    if (cookies.ldm_token) return verifyUserToken(cookies.ldm_token);
    return null;
};

// Load the full, current user row (so suspensions / type changes take effect
// immediately rather than waiting for the 30-day token to expire).
export const requireUser = async (req) => {
    const payload = getTokenPayload(req);
    if (!payload?.id) return null;
    const rows = await sql`
        SELECT id, email, first_name, last_name, phone, account_type, company_id,
               email_verified, status
        FROM users WHERE id = ${payload.id} LIMIT 1`;
    const u = rows[0];
    if (!u || u.status !== 'active') return null;
    return u;
};

export { clientIp };
