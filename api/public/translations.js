// GET /api/public/translations — admin-overridden strings, grouped by lang.
// The front merges these on top of the bundled JSON dictionaries so admins can
// edit any localized string without redeploying.
import { sql, json } from '../_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    try {
        const rows = await sql`SELECT lang, tkey, value FROM translations`;
        const out = {};
        for (const r of rows) {
            if (!out[r.lang]) out[r.lang] = {};
            out[r.lang][r.tkey] = r.value;
        }
        // Cache for 60s — overrides change infrequently and we want to reduce
        // db load when the truck page is hit by many visitors.
        res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        return json(res, 200, { overrides: out });
    } catch (e) {
        console.error('public/translations', e);
        return json(res, 500, { error: 'server error' });
    }
}
