// POST /api/screenshot-log — public, accepts screenshot-modal form submissions.
import { sql, json, readJsonBody, clientIp } from './_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
    try {
        const b = await readJsonBody(req);
        const { company_name = '', plate = '', driver = '', note = '', truck_type = '', payload = null } = b || {};
        const ua = req.headers['user-agent'] || '';
        const ip = clientIp(req);
        await sql`
            INSERT INTO screenshot_logs (company_name, plate, driver, note, truck_type, payload, user_agent, ip)
            VALUES (${company_name.slice(0, 200)}, ${plate.slice(0, 50)}, ${driver.slice(0, 200)}, ${note.slice(0, 1000)}, ${truck_type.slice(0, 50)}, ${payload}, ${ua.slice(0, 500)}, ${ip})
        `;
        return json(res, 200, { ok: true });
    } catch (e) {
        console.error('screenshot-log', e);
        return json(res, 500, { error: 'server error' });
    }
}
