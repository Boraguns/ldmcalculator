// End-user account panel API — routed by /api/account/<resource>.
//   profile      · GET current profile · PATCH update name/phone
//   password     · POST change password (current + new)
//   subscription · GET active subscription + company seat usage
//   payments     · GET payment/invoice history
//   history      · GET usage history (stacking runs + tool documents)
//   documents    · GET saved tool documents · POST save one
import { sql, json, readJsonBody } from '../_lib/db.js';
import { requireUser, hashPassword, comparePassword } from '../_lib/userauth.js';

const publicUser = (u) => ({
    id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name,
    phone: u.phone, accountType: u.account_type, companyId: u.company_id,
    emailVerified: u.email_verified,
});

async function profile(req, res, user) {
    if (req.method === 'PATCH' || req.method === 'POST') {
        const b = await readJsonBody(req);
        const firstName = String(b.firstName ?? user.first_name).trim().slice(0, 80);
        const lastName = String(b.lastName ?? user.last_name).trim().slice(0, 80);
        const phone = String(b.phone ?? user.phone).trim().slice(0, 40);
        const rows = await sql`
            UPDATE users SET first_name = ${firstName}, last_name = ${lastName}, phone = ${phone}, updated_at = NOW()
            WHERE id = ${user.id}
            RETURNING id, email, first_name, last_name, phone, account_type, company_id, email_verified`;
        return json(res, 200, { user: publicUser(rows[0]) });
    }
    return json(res, 200, { user: publicUser(user) });
}

async function password(req, res, user) {
    const b = await readJsonBody(req);
    const current = String(b.current || '');
    const next = String(b.password || '');
    if (next.length < 8) return json(res, 400, { error: 'weak_password' });
    const rows = await sql`SELECT password_hash FROM users WHERE id = ${user.id} LIMIT 1`;
    const ok = await comparePassword(current, rows[0]?.password_hash || '');
    if (!ok) return json(res, 400, { error: 'wrong_password' });
    const hash = await hashPassword(next);
    await sql`UPDATE users SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${user.id}`;
    return json(res, 200, { ok: true });
}

async function subscription(req, res, user) {
    const subs = await sql`
        SELECT id, plan, period, tier, currency, amount, status,
               current_period_start, current_period_end, cancel_at_period_end
        FROM subscriptions
        WHERE status IN ('active','past_due','pending')
          AND (user_id = ${user.id} ${user.company_id ? sql`OR company_id = ${user.company_id}` : sql``})
        ORDER BY current_period_end DESC NULLS LAST LIMIT 1`;
    let seats = null;
    if (user.company_id) {
        const c = await sql`SELECT seat_count FROM companies WHERE id = ${user.company_id} LIMIT 1`;
        const used = await sql`SELECT COUNT(*)::int AS n FROM users WHERE company_id = ${user.company_id} AND status = 'active'`;
        seats = { total: c[0]?.seat_count || 0, used: used[0]?.n || 0 };
    }
    return json(res, 200, { subscription: subs[0] || null, seats });
}

async function payments(req, res, user) {
    const rows = await sql`
        SELECT id, amount, currency, vat_rate, vat_amount, status, provider, provider_ref,
               invoice_no, kind, paid_at, created_at
        FROM payments
        WHERE user_id = ${user.id} ${user.company_id ? sql`OR company_id = ${user.company_id}` : sql``}
        ORDER BY created_at DESC LIMIT 100`;
    return json(res, 200, { payments: rows });
}

async function history(req, res, user) {
    const rows = await sql`
        SELECT id, kind, tool, day, meta, created_at
        FROM usage_events
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC LIMIT 200`;
    return json(res, 200, { history: rows });
}

async function documents(req, res, user) {
    if (req.method === 'POST') {
        const b = await readJsonBody(req);
        const type = String(b.type || 'cmr').slice(0, 40);
        const title = String(b.title || '').slice(0, 200);
        const rows = await sql`
            INSERT INTO documents (user_id, type, title, data)
            VALUES (${user.id}, ${type}, ${title}, ${b.data ? JSON.stringify(b.data) : null})
            RETURNING id, type, title, created_at`;
        return json(res, 200, { document: rows[0] });
    }
    const rows = await sql`
        SELECT id, type, title, data, created_at FROM documents
        WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 200`;
    return json(res, 200, { documents: rows });
}

const RESOURCES = { profile, password, subscription, payments, history, documents };

export default async function handler(req, res) {
    const resource = (req.query?.resource || '').toString();
    const fn = RESOURCES[resource];
    if (!fn) return json(res, 404, { error: 'not_found' });
    const user = await requireUser(req);
    if (!user) return json(res, 401, { error: 'unauthorized' });
    try {
        return await fn(req, res, user);
    } catch (e) {
        console.error('account/' + resource, e);
        return json(res, 500, { error: 'server_error' });
    }
}
