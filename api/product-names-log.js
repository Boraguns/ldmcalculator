// POST /api/product-names-log — public, fire-and-forget log of the
// product NAMES the user entered in the wizard for one calculation event.
// Stored grouped by client-generated session_id so the admin can see all
// names a single visitor used across multiple calculations.
import { sql, json, readJsonBody } from './_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
    try {
        const b = await readJsonBody(req);
        const session_id = String(b?.session_id || '').slice(0, 100);
        const namesRaw = Array.isArray(b?.names) ? b.names : [];
        const names = namesRaw
            .map(n => typeof n === 'string' ? n.trim() : '')
            .filter(Boolean)
            .slice(0, 50);
        if (!session_id || names.length === 0) {
            return json(res, 200, { ok: true, skipped: true });
        }
        const ua = (req.headers['user-agent'] || '').slice(0, 300);
        await sql`
            INSERT INTO product_name_logs (session_id, names, user_agent)
            VALUES (${session_id}, ${JSON.stringify(names)}::jsonb, ${ua})
        `;
        return json(res, 200, { ok: true });
    } catch (e) {
        console.error('product-names-log', e);
        return json(res, 500, { error: 'server error' });
    }
}
