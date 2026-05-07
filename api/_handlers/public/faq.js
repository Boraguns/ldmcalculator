// GET /api/public/faq — returns active FAQ items grouped by language.
// The home page falls back to the bundled JSON default for any language with
// no admin entries.
import { sql, json } from '../../_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    try {
        const rows = await sql`
            SELECT lang, sort_order, question, answer
            FROM faq_items
            WHERE is_active = TRUE
            ORDER BY lang, sort_order ASC, id ASC
        `;
        const out = {};
        for (const r of rows) {
            if (!out[r.lang]) out[r.lang] = [];
            out[r.lang].push({ q: r.question, a: r.answer });
        }
        res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
        return json(res, 200, { faq: out });
    } catch (e) {
        console.error('public/faq', e);
        return json(res, 500, { error: 'server error' });
    }
}
