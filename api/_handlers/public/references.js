// GET /api/public/references — active reference companies for the public gallery.
import { sql, json } from '../../_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    try {
        const items = await sql`
            SELECT id, name, logo_url, website
            FROM reference_companies
            WHERE is_active = TRUE
            ORDER BY sort_order ASC, id ASC
        `;
        return json(res, 200, { items });
    } catch (e) {
        // Table may not exist yet (no references added) — return empty gracefully.
        console.error('public/references', e);
        return json(res, 200, { items: [] });
    }
}
