// POST /api/contact — public, accepts contact-form submissions.
import { sql, json, readJsonBody, clientIp } from './_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
    try {
        const body = await readJsonBody(req);
        const { name = '', email = '', subject = '', message = '' } = body || {};
        if (!name.trim() || !email.trim() || !message.trim()) {
            return json(res, 400, { error: 'name, email, message required' });
        }
        const ua = req.headers['user-agent'] || '';
        const ip = clientIp(req);
        await sql`
            INSERT INTO contact_messages (name, email, subject, message, user_agent, ip)
            VALUES (${name.slice(0, 200)}, ${email.slice(0, 200)}, ${subject.slice(0, 200)}, ${message.slice(0, 5000)}, ${ua.slice(0, 500)}, ${ip})
        `;
        return json(res, 200, { ok: true });
    } catch (e) {
        console.error('contact', e);
        return json(res, 500, { error: 'server error' });
    }
}
