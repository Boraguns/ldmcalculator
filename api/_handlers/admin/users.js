// Admin user management & tracking.
//   GET  /api/admin/users                  → users list (joined w/ company + usage counters)
//   POST /api/admin/users { id, action }    → manage a single user
//       action: 'suspend' | 'activate' | 'verify' | 'resend-verify' | 'delete'
import { sql, json, requireAdmin, readJsonBody } from '../../_lib/db.js';
import { randomToken } from '../../_lib/userauth.js';
import { sendVerificationEmail } from '../../_lib/mailer.js';

const HOUR = 3600 * 1000;

export default async function handler(req, res) {
    if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });

    try {
        if (req.method === 'GET') {
            const rows = await sql`
                SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.account_type,
                       u.company_id, u.email_verified, u.status, u.created_at, u.updated_at,
                       c.name AS company_name,
                       COALESCE(d.docs, 0)::int  AS document_count,
                       COALESCE(g.uses, 0)::int  AS usage_count,
                       s.plan AS sub_plan, s.status AS sub_status
                FROM users u
                LEFT JOIN companies c ON c.id = u.company_id
                LEFT JOIN (SELECT user_id, COUNT(*) AS docs FROM documents GROUP BY user_id) d ON d.user_id = u.id
                LEFT JOIN (SELECT user_id, COUNT(*) AS uses FROM usage_events WHERE user_id IS NOT NULL GROUP BY user_id) g ON g.user_id = u.id
                LEFT JOIN LATERAL (
                    SELECT plan, status FROM subscriptions
                    WHERE user_id = u.id AND status IN ('active','past_due')
                    ORDER BY current_period_end DESC NULLS LAST LIMIT 1
                ) s ON TRUE
                ORDER BY u.created_at DESC LIMIT 1000`;
            return json(res, 200, { users: rows });
        }

        if (req.method === 'POST') {
            const b = await readJsonBody(req);
            const id = Number(b.id);
            const action = String(b.action || '');
            if (!id || !action) return json(res, 400, { error: 'missing_params' });

            const found = await sql`SELECT id, email, email_verified FROM users WHERE id = ${id} LIMIT 1`;
            const u = found[0];
            if (!u) return json(res, 404, { error: 'not_found' });

            switch (action) {
                case 'suspend':
                    await sql`UPDATE users SET status = 'suspended', updated_at = NOW() WHERE id = ${id}`;
                    return json(res, 200, { ok: true, status: 'suspended' });

                case 'activate':
                    await sql`UPDATE users SET status = 'active', updated_at = NOW() WHERE id = ${id}`;
                    return json(res, 200, { ok: true, status: 'active' });

                case 'verify':
                    await sql`UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = ${id}`;
                    return json(res, 200, { ok: true, email_verified: true });

                case 'resend-verify': {
                    if (u.email_verified) return json(res, 200, { ok: true, alreadyVerified: true });
                    await sql`UPDATE email_tokens SET used_at = NOW()
                              WHERE user_id = ${id} AND type = 'verify' AND used_at IS NULL`;
                    const token = randomToken();
                    await sql`INSERT INTO email_tokens (user_id, token, type, expires_at)
                              VALUES (${id}, ${token}, 'verify', ${new Date(Date.now() + 24 * HOUR).toISOString()})`;
                    try { await sendVerificationEmail(u.email, token); }
                    catch (e) { console.error('admin resend verify', e); return json(res, 200, { ok: false, mailError: true }); }
                    return json(res, 200, { ok: true });
                }

                case 'delete':
                    // No FK cascades in the schema — remove dependent rows first.
                    await sql`DELETE FROM email_tokens WHERE user_id = ${id}`;
                    await sql`DELETE FROM usage_events WHERE user_id = ${id}`;
                    await sql`DELETE FROM documents WHERE user_id = ${id}`;
                    await sql`DELETE FROM consents WHERE user_id = ${id}`;
                    await sql`DELETE FROM payments WHERE user_id = ${id}`;
                    await sql`DELETE FROM subscriptions WHERE user_id = ${id}`;
                    await sql`DELETE FROM users WHERE id = ${id}`;
                    return json(res, 200, { ok: true, deleted: true });

                default:
                    return json(res, 400, { error: 'unknown_action' });
            }
        }

        return json(res, 405, { error: 'method_not_allowed' });
    } catch (e) {
        console.error('admin/users', e);
        return json(res, 500, { error: 'server_error' });
    }
}
