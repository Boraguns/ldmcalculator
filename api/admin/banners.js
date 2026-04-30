// GET    /api/admin/banners                     → list slots
// PUT    /api/admin/banners  { slot, image_url } → upsert one slot
// Note: Image upload to a CDN is out of scope here. For now we accept a URL
// (e.g. an Imgur, Cloudflare R2 or your own static path). Wire up multipart
// to a storage provider later if you want in-admin uploads.
import { sql, json, requireAdmin, readJsonBody } from '../_lib/db.js';

const VALID_SLOTS = new Set(['left', 'right', 'top']);

export default async function handler(req, res) {
    if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
    try {
        if (req.method === 'GET') {
            const rows = await sql`SELECT slot, image_url, updated_at FROM banners`;
            return json(res, 200, { items: rows });
        }
        if (req.method === 'PUT') {
            const { slot, image_url } = await readJsonBody(req);
            if (!VALID_SLOTS.has(slot)) return json(res, 400, { error: 'slot must be left|right|top' });
            if (!image_url) return json(res, 400, { error: 'image_url required' });
            await sql`
                INSERT INTO banners (slot, image_url, updated_at)
                VALUES (${slot}, ${image_url}, NOW())
                ON CONFLICT (slot) DO UPDATE SET image_url = EXCLUDED.image_url, updated_at = NOW()
            `;
            return json(res, 200, { ok: true });
        }
        return json(res, 405, { error: 'method not allowed' });
    } catch (e) {
        console.error('admin/banners', e);
        return json(res, 500, { error: 'server error' });
    }
}
