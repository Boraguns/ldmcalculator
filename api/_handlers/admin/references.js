// CRUD for the public "Referanslar" (reference companies) gallery.
//   GET    /api/admin/references                → list all
//   POST   /api/admin/references   { ... }      → create
//   PATCH  /api/admin/references   { id, ... }  → update
//   DELETE /api/admin/references?id=N           → delete
import { sql, json, requireAdmin, readJsonBody } from '../../_lib/db.js';

// Self-provision the table so no manual migration step is required. Guarded by
// a module-level flag so warm invocations skip the round-trip.
let ensured = false;
async function ensureTable() {
    if (ensured) return;
    await sql`
        CREATE TABLE IF NOT EXISTS reference_companies (
            id         SERIAL PRIMARY KEY,
            name       TEXT NOT NULL,
            logo_url   TEXT DEFAULT '',
            website    TEXT DEFAULT '',
            sort_order INTEGER DEFAULT 0,
            is_active  BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `;
    ensured = true;
}

export default async function handler(req, res) {
    if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
    try {
        await ensureTable();
        if (req.method === 'GET') {
            const rows = await sql`SELECT * FROM reference_companies ORDER BY sort_order ASC, id ASC`;
            return json(res, 200, { items: rows });
        }
        if (req.method === 'POST') {
            const b = await readJsonBody(req);
            const { name, logo_url = '', website = '', sort_order = 0, is_active = true } = b;
            if (!name || !name.trim()) return json(res, 400, { error: 'name required' });
            const rows = await sql`
                INSERT INTO reference_companies (name, logo_url, website, sort_order, is_active)
                VALUES (${name.trim()}, ${logo_url}, ${website}, ${sort_order}, ${is_active})
                RETURNING *
            `;
            return json(res, 200, { item: rows[0] });
        }
        if (req.method === 'PATCH') {
            const b = await readJsonBody(req);
            const { id, name, logo_url, website, sort_order, is_active } = b;
            if (!id) return json(res, 400, { error: 'id required' });
            await sql`
                UPDATE reference_companies SET
                    name       = COALESCE(${name}, name),
                    logo_url   = COALESCE(${logo_url}, logo_url),
                    website    = COALESCE(${website}, website),
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
            await sql`DELETE FROM reference_companies WHERE id = ${id}`;
            return json(res, 200, { ok: true });
        }
        return json(res, 405, { error: 'method not allowed' });
    } catch (e) {
        console.error('admin/references', e);
        return json(res, 500, { error: 'server error' });
    }
}
