// Admin view of subscriptions, users and revenue.
//   GET /api/admin/subscriptions            → recent subscriptions (joined w/ user/company)
//   GET /api/admin/subscriptions?view=stats → summary counters
//   GET /api/admin/subscriptions?view=users → registered users list
//   GET /api/admin/subscriptions?view=payments → recent payments
import { sql, json, requireAdmin } from '../../_lib/db.js';

export default async function handler(req, res) {
    if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
    if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
    const view = (req.query?.view || 'list').toString();
    try {
        if (view === 'stats') {
            const users = await sql`SELECT COUNT(*)::int AS n FROM users`;
            const companies = await sql`SELECT COUNT(*)::int AS n FROM companies`;
            const activeSubs = await sql`SELECT COUNT(*)::int AS n FROM subscriptions WHERE status = 'active'`;
            const mrr = await sql`
                SELECT currency, COALESCE(SUM(
                    CASE WHEN period = 'yearly' THEN amount / 12 ELSE amount END
                ), 0) AS mrr
                FROM subscriptions WHERE status = 'active' GROUP BY currency`;
            const paidThisMonth = await sql`
                SELECT currency, COALESCE(SUM(amount), 0) AS total, COUNT(*)::int AS n
                FROM payments WHERE status = 'paid' AND paid_at >= date_trunc('month', NOW())
                GROUP BY currency`;
            return json(res, 200, {
                stats: {
                    users: users[0].n, companies: companies[0].n, activeSubs: activeSubs[0].n,
                    mrr, paidThisMonth,
                },
            });
        }

        if (view === 'users') {
            const rows = await sql`
                SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.account_type,
                       u.company_id, u.email_verified, u.status, u.created_at,
                       c.name AS company_name
                FROM users u LEFT JOIN companies c ON c.id = u.company_id
                ORDER BY u.created_at DESC LIMIT 500`;
            return json(res, 200, { users: rows });
        }

        if (view === 'payments') {
            const rows = await sql`
                SELECT p.id, p.amount, p.currency, p.vat_amount, p.status, p.kind,
                       p.provider_ref, p.invoice_no, p.paid_at, p.created_at,
                       u.email AS user_email, c.name AS company_name
                FROM payments p
                LEFT JOIN users u ON u.id = p.user_id
                LEFT JOIN companies c ON c.id = p.company_id
                ORDER BY p.created_at DESC LIMIT 500`;
            return json(res, 200, { payments: rows });
        }

        // default: subscriptions list
        const rows = await sql`
            SELECT s.id, s.owner_type, s.plan, s.period, s.tier, s.currency, s.amount, s.status,
                   s.current_period_start, s.current_period_end, s.cancel_at_period_end, s.created_at,
                   u.email AS user_email, c.name AS company_name
            FROM subscriptions s
            LEFT JOIN users u ON u.id = s.user_id
            LEFT JOIN companies c ON c.id = s.company_id
            ORDER BY s.created_at DESC LIMIT 500`;
        return json(res, 200, { subscriptions: rows });
    } catch (e) {
        console.error('admin/subscriptions', e);
        return json(res, 500, { error: 'server_error' });
    }
}
