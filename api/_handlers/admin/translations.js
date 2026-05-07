// CRUD for admin-managed translation overrides.
//   GET    /api/admin/translations?lang=tr             → all overrides for a lang
//   PUT    /api/admin/translations { lang, key, value } → upsert one override
//   DELETE /api/admin/translations?lang=tr&key=foo     → drop one override
import { sql, json, requireAdmin, readJsonBody } from '../../_lib/db.js';

const SUPPORTED = new Set(['en', 'tr', 'de', 'ru', 'fr', 'ar']);

export default async function handler(req, res) {
    if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
    try {
        if (req.method === 'GET') {
            const lang = (req.query?.lang || '').toString();
            if (!SUPPORTED.has(lang)) return json(res, 400, { error: 'invalid lang' });
            const rows = await sql`SELECT tkey, value, updated_at FROM translations WHERE lang = ${lang}`;
            const map = {};
            for (const r of rows) map[r.tkey] = r.value;
            return json(res, 200, { lang, overrides: map });
        }
        if (req.method === 'PUT') {
            const { lang, key, value } = await readJsonBody(req);
            if (!SUPPORTED.has(lang)) return json(res, 400, { error: 'invalid lang' });
            if (!key || typeof key !== 'string') return json(res, 400, { error: 'key required' });
            if (typeof value !== 'string') return json(res, 400, { error: 'value must be a string' });
            // Empty value clears the override → fall back to default JSON.
            if (value === '') {
                await sql`DELETE FROM translations WHERE lang = ${lang} AND tkey = ${key}`;
                return json(res, 200, { ok: true, cleared: true });
            }
            await sql`
                INSERT INTO translations (lang, tkey, value, updated_at)
                VALUES (${lang}, ${key}, ${value}, NOW())
                ON CONFLICT (lang, tkey) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
            `;
            return json(res, 200, { ok: true });
        }
        if (req.method === 'DELETE') {
            const lang = (req.query?.lang || '').toString();
            const key = (req.query?.key || '').toString();
            if (!SUPPORTED.has(lang) || !key) return json(res, 400, { error: 'lang+key required' });
            await sql`DELETE FROM translations WHERE lang = ${lang} AND tkey = ${key}`;
            return json(res, 200, { ok: true });
        }
        return json(res, 405, { error: 'method not allowed' });
    } catch (e) {
        console.error('admin/translations', e);
        return json(res, 500, { error: 'server error' });
    }
}
