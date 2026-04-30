// CRUD for flag → companies.
//   GET    /api/admin/flag-companies                → list all
//   POST   /api/admin/flag-companies   { ... }      → create
//   PATCH  /api/admin/flag-companies   { id, ... }  → update
//   DELETE /api/admin/flag-companies?id=N           → delete
import { sql, json, requireAdmin, readJsonBody } from '../_lib/db.js';

export default async function handler(req, res) {
    if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
    try {
        if (req.method === 'GET') {
            const rows = await sql`SELECT * FROM flag_companies ORDER BY country_code, sort_order, id`;
            return json(res, 200, { items: rows });
        }
        if (req.method === 'POST') {
            const b = await readJsonBody(req);
            const { country_code, name, description = '', logo_url = '', website = '', is_featured = false, sort_order = 0 } = b;
            if (!country_code || !name) return json(res, 400, { error: 'country_code and name required' });
            const rows = await sql`
                INSERT INTO flag_companies (country_code, name, description, logo_url, website, is_featured, sort_order)
                VALUES (${country_code}, ${name}, ${description}, ${logo_url}, ${website}, ${is_featured}, ${sort_order})
                RETURNING *
            `;
            return json(res, 200, { item: rows[0] });
        }
        if (req.method === 'PATCH') {
            const b = await readJsonBody(req);
            const { id, country_code, name, description, logo_url, website, is_featured, sort_order } = b;
            if (!id) return json(res, 400, { error: 'id required' });
            await sql`
                UPDATE flag_companies SET
                    country_code = COALESCE(${country_code}, country_code),
                    name         = COALESCE(${name}, name),
                    description  = COALESCE(${description}, description),
                    logo_url     = COALESCE(${logo_url}, logo_url),
                    website      = COALESCE(${website}, website),
                    is_featured  = COALESCE(${is_featured}, is_featured),
                    sort_order   = COALESCE(${sort_order}, sort_order),
                    updated_at   = NOW()
                WHERE id = ${id}
            `;
            return json(res, 200, { ok: true });
        }
        if (req.method === 'DELETE') {
            const id = req.query?.id;
            if (!id) return json(res, 400, { error: 'id required' });
            await sql`DELETE FROM flag_companies WHERE id = ${id}`;
            return json(res, 200, { ok: true });
        }
        return json(res, 405, { error: 'method not allowed' });
    } catch (e) {
        console.error('admin/flag-companies', e);
        return json(res, 500, { error: 'server error' });
    }
}
