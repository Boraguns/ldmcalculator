// CRUD for admin-managed FAQ items shown on the home page.
//   GET    /api/admin/faq?lang=tr               → list by language
//   POST   /api/admin/faq   { lang, question, answer, sort_order }
//   PATCH  /api/admin/faq   { id, question?, answer?, sort_order?, is_active? }
//   DELETE /api/admin/faq?id=N
import { sql, json, requireAdmin, readJsonBody } from '../../_lib/db.js';

const SUPPORTED = new Set(['en', 'tr', 'de', 'ru', 'fr', 'ar']);

export default async function handler(req, res) {
    if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
    try {
        if (req.method === 'GET') {
            const lang = (req.query?.lang || '').toString();
            if (!SUPPORTED.has(lang)) return json(res, 400, { error: 'invalid lang' });
            const rows = await sql`
                SELECT id, lang, sort_order, question, answer, is_active, updated_at
                FROM faq_items
                WHERE lang = ${lang}
                ORDER BY sort_order ASC, id ASC
            `;
            return json(res, 200, { items: rows });
        }
        if (req.method === 'POST') {
            const b = await readJsonBody(req);
            const { lang, question, answer, sort_order = 0 } = b;
            if (!SUPPORTED.has(lang)) return json(res, 400, { error: 'invalid lang' });
            if (!question || !answer) return json(res, 400, { error: 'question and answer required' });
            const rows = await sql`
                INSERT INTO faq_items (lang, sort_order, question, answer)
                VALUES (${lang}, ${sort_order}, ${question}, ${answer})
                RETURNING *
            `;
            return json(res, 200, { item: rows[0] });
        }
        if (req.method === 'PATCH') {
            const b = await readJsonBody(req);
            const { id, question, answer, sort_order, is_active } = b;
            if (!id) return json(res, 400, { error: 'id required' });
            await sql`
                UPDATE faq_items SET
                    question   = COALESCE(${question}, question),
                    answer     = COALESCE(${answer}, answer),
                    sort_order = COALESCE(${sort_order}, sort_order),
                    is_active  = COALESCE(${is_active}, is_active),
                    updated_at = NOW()
                WHERE id = ${id}
            `;
            return json(res, 200, { ok: true });
        }
        if (req.method === 'DELETE') {
            const id = req.query?.id;
            if (!id) return json(res, 400, { error: 'id required' });
            await sql`DELETE FROM faq_items WHERE id = ${id}`;
            return json(res, 200, { ok: true });
        }
        return json(res, 405, { error: 'method not allowed' });
    } catch (e) {
        console.error('admin/faq', e);
        return json(res, 500, { error: 'server error' });
    }
}
