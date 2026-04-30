// Shared Neon Postgres client + JWT helpers for serverless API routes.
// All API routes MUST import from here so the connection is reused via
// the @neondatabase/serverless HTTP fetch driver (Vercel-friendly).

import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

if (!process.env.DATABASE_URL) {
    // We don't throw — just log — so previews without env still build.
    console.warn('[api/_lib/db] DATABASE_URL is not set');
}

export const sql = neon(process.env.DATABASE_URL || '');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const JWT_EXP = '7d';

export const signAdminToken = (payload) =>
    jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXP });

export const verifyAdminToken = (token) => {
    try { return jwt.verify(token, JWT_SECRET); }
    catch { return null; }
};

/**
 * Pulls the bearer token from `Authorization: Bearer <jwt>` and verifies it.
 * Returns the decoded payload or null. The caller should respond 401 on null.
 */
export const requireAdmin = (req) => {
    const auth = req.headers?.authorization || req.headers?.Authorization || '';
    const m = /^Bearer\s+(.+)$/i.exec(auth);
    if (!m) return null;
    return verifyAdminToken(m[1]);
};

export const json = (res, status, body) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
};

export const readJsonBody = (req) => new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
        if (!data) return resolve({});
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
});

export const clientIp = (req) =>
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress || '';
