// GET /api/admin/messages?type=contact|advertise|screenshot — list submissions.
// PATCH /api/admin/messages — { type, id, is_read } mark as read.
import { sql, json, requireAdmin, readJsonBody } from '../_lib/db.js';

const TABLES = {
    contact:    'contact_messages',
    advertise:  'advertise_messages',
    screenshot: 'screenshot_logs'
};

export default async function handler(req, res) {
    if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
    try {
        if (req.method === 'GET') {
            const type = (req.query?.type || 'contact').toString();
            const table = TABLES[type];
            if (!table) return json(res, 400, { error: 'invalid type' });
            // sql template literals don't accept dynamic table names, so we
            // pick from a hard-coded whitelist above and switch by type.
            let rows;
            if (table === 'contact_messages') {
                rows = await sql`SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 200`;
            } else if (table === 'advertise_messages') {
                rows = await sql`SELECT * FROM advertise_messages ORDER BY created_at DESC LIMIT 200`;
            } else {
                rows = await sql`SELECT id, company_name, plate, driver, note, truck_type, created_at, ip FROM screenshot_logs ORDER BY created_at DESC LIMIT 200`;
            }
            return json(res, 200, { items: rows });
        }
        if (req.method === 'PATCH') {
            const { type, id, is_read } = await readJsonBody(req);
            const table = TABLES[type];
            if (!table || !id) return json(res, 400, { error: 'type, id required' });
            if (table === 'contact_messages') {
                await sql`UPDATE contact_messages SET is_read=${!!is_read} WHERE id=${id}`;
            } else if (table === 'advertise_messages') {
                await sql`UPDATE advertise_messages SET is_read=${!!is_read} WHERE id=${id}`;
            } else {
                return json(res, 400, { error: 'screenshot logs are read-only' });
            }
            return json(res, 200, { ok: true });
        }
        return json(res, 405, { error: 'method not allowed' });
    } catch (e) {
        console.error('admin/messages', e);
        return json(res, 500, { error: 'server error' });
    }
}
