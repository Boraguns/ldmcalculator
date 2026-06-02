// GET    /api/admin/documents?type=cmr|invoice|packing  — list saved tool
//        documents (CMR / Invoice / Packing List) with the owning user.
// DELETE /api/admin/documents?id=<id>                    — remove one log row.
// The heavy `data` JSON (base64 logo/stamp/signature) is intentionally NOT
// selected here — the admin log only needs the metadata.
import { sql, json, requireAdmin } from '../../_lib/db.js';

const TYPES = new Set(['cmr', 'invoice', 'packing']);

export default async function handler(req, res) {
    if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
    try {
        if (req.method === 'GET') {
            const type = (req.query?.type || '').toString();
            const rows = TYPES.has(type)
                ? await sql`
                    SELECT d.id, d.type, d.title, d.created_at,
                           u.email, u.first_name, u.last_name
                    FROM documents d LEFT JOIN users u ON u.id = d.user_id
                    WHERE d.type = ${type}
                    ORDER BY d.created_at DESC LIMIT 300`
                : await sql`
                    SELECT d.id, d.type, d.title, d.created_at,
                           u.email, u.first_name, u.last_name
                    FROM documents d LEFT JOIN users u ON u.id = d.user_id
                    ORDER BY d.created_at DESC LIMIT 300`;
            return json(res, 200, { items: rows });
        }
        if (req.method === 'DELETE') {
            const id = (req.query?.id || '').toString();
            if (!id) return json(res, 400, { error: 'id required' });
            await sql`DELETE FROM documents WHERE id = ${id}`;
            return json(res, 200, { ok: true });
        }
        return json(res, 405, { error: 'method not allowed' });
    } catch (e) {
        console.error('admin/documents', e);
        return json(res, 200, { items: [] }); // table may be empty/missing
    }
}
