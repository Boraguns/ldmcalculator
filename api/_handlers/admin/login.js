// POST /api/admin/login — exchange email+password for a JWT.
import bcrypt from 'bcryptjs';
import { sql, json, readJsonBody, signAdminToken } from '../../_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
    try {
        const { email = '', password = '' } = await readJsonBody(req);
        if (!email || !password) return json(res, 400, { error: 'email and password required' });
        const rows = await sql`SELECT id, email, password_hash, name FROM admin_users WHERE email = ${email.toLowerCase()} LIMIT 1`;
        const user = rows[0];
        if (!user) return json(res, 401, { error: 'Invalid credentials' });
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return json(res, 401, { error: 'Invalid credentials' });
        const token = signAdminToken({ id: user.id, email: user.email, name: user.name });
        return json(res, 200, { token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (e) {
        console.error('admin/login', e);
        return json(res, 500, { error: 'server error' });
    }
}
