// POST /api/advertise — public, accepts advertise-form submissions.
import { sql, json, readJsonBody } from './_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
    try {
        const b = await readJsonBody(req);
        const { company_name = '', contact_name = '', email = '', phone = '', budget = '', message = '' } = b || {};
        if (!company_name.trim() || !contact_name.trim() || !email.trim()) {
            return json(res, 400, { error: 'company_name, contact_name, email required' });
        }
        await sql`
            INSERT INTO advertise_messages (company_name, contact_name, email, phone, budget, message)
            VALUES (${company_name.slice(0, 200)}, ${contact_name.slice(0, 200)}, ${email.slice(0, 200)}, ${phone.slice(0, 50)}, ${budget.slice(0, 100)}, ${message.slice(0, 5000)})
        `;
        return json(res, 200, { ok: true });
    } catch (e) {
        console.error('advertise', e);
        return json(res, 500, { error: 'server error' });
    }
}
