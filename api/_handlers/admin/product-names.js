// GET /api/admin/product-names — returns the last N calculation events
// grouped by session_id for display in the admin panel.
import { sql, json, requireAdmin } from '../../_lib/db.js';

export default async function handler(req, res) {
    if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
    if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed' });
    try {
        // Latest 500 events. Group on the client side by session.
        const rows = await sql`
            SELECT id, session_id, names, user_agent, created_at
            FROM product_name_logs
            ORDER BY created_at DESC
            LIMIT 500
        `;
        return json(res, 200, { items: rows });
    } catch (e) {
        console.error('admin/product-names', e);
        return json(res, 500, { error: 'server error' });
    }
}
