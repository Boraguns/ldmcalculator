// CRUD for general site image overrides (logos, vehicle thumbnails, backgrounds…).
//   GET  /api/admin/site-assets                            → list all
//   PUT  /api/admin/site-assets  { asset_key, image_url }  → upsert (empty url → delete)
import { sql, json, requireAdmin, readJsonBody } from '../_lib/db.js';

export default async function handler(req, res) {
    if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
    try {
        if (req.method === 'GET') {
            const rows = await sql`SELECT asset_key, image_url, updated_at FROM site_assets ORDER BY asset_key`;
            return json(res, 200, { items: rows });
        }
        if (req.method === 'PUT') {
            const { asset_key, image_url } = await readJsonBody(req);
            if (!asset_key || typeof asset_key !== 'string') return json(res, 400, { error: 'asset_key required' });
            if (typeof image_url !== 'string') return json(res, 400, { error: 'image_url required' });
            if (image_url === '') {
                await sql`DELETE FROM site_assets WHERE asset_key = ${asset_key}`;
                return json(res, 200, { ok: true, cleared: true });
            }
            await sql`
                INSERT INTO site_assets (asset_key, image_url, updated_at)
                VALUES (${asset_key}, ${image_url}, NOW())
                ON CONFLICT (asset_key) DO UPDATE SET image_url = EXCLUDED.image_url, updated_at = NOW()
            `;
            return json(res, 200, { ok: true });
        }
        return json(res, 405, { error: 'method not allowed' });
    } catch (e) {
        console.error('admin/site-assets', e);
        return json(res, 500, { error: 'server error' });
    }
}
