// Admin view of subscriptions, users and revenue.
//   GET /api/admin/subscriptions            → recent subscriptions (joined w/ user/company)
//   GET /api/admin/subscriptions?view=stats → summary counters
//   GET /api/admin/subscriptions?view=users → registered users list
//   GET /api/admin/subscriptions?view=payments → recent payments
import { sql, json, requireAdmin, readJsonBody } from '../../_lib/db.js';
import { periodEnd, getPrice, vatBreakdown } from '../../_lib/pricing.js';

// Launch campaign: paid plans are free. While true, manual approvals record a
// collected amount of 0 (the list price is stashed in payments.raw so the UI can
// show it struck-through). Mirror of src/utils/promo.js — keep them in sync.
const PROMO_FREE = true;

export default async function handler(req, res) {
    if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });

    // Manual approval of pending subscription requests (used while PayTR is not
    // wired up). approve → activate now for the selected period; reject → cancel.
    if (req.method === 'POST') {
        try {
            const b = await readJsonBody(req);
            const id = parseInt(b.id, 10);
            const action = (b.action || '').toString();
            if (!id) return json(res, 400, { error: 'id_required' });
            const rows = await sql`
                SELECT id, owner_type, plan, period, tier, currency, amount, status, user_id, company_id
                FROM subscriptions WHERE id = ${id} LIMIT 1`;
            const sub = rows[0];
            if (!sub) return json(res, 404, { error: 'not_found' });

            if (action === 'approve') {
                const start = new Date();
                const end = periodEnd(start, sub.period || 'monthly');
                await sql`
                    UPDATE subscriptions
                    SET status = 'active', current_period_start = ${start.toISOString()},
                        current_period_end = ${end.toISOString()}, cancel_at_period_end = FALSE,
                        updated_at = NOW()
                    WHERE id = ${id}`;

                // Record a "collected" (paid) invoice for the manual approval so it
                // shows up in revenue + the user's payment history. provider='manual'
                // is rendered as "IBAN/EFT"; PayTR-paid rows are "Kredi Kartı".
                // Idempotent: skip if a paid manual payment already exists for this sub.
                const existing = await sql`
                    SELECT id FROM payments
                    WHERE subscription_id = ${id} AND status = 'paid' AND provider = 'manual'
                    LIMIT 1`;
                if (!existing[0]) {
                    const price = await getPrice({
                        plan: sub.plan, tier: sub.tier ?? null, period: sub.period, currency: sub.currency,
                    });
                    const vatRate = price ? Number(price.vat_rate) : 20;
                    const listAmount = Number(sub.amount) || 0;
                    const { vat: listVat } = vatBreakdown(listAmount, vatRate);
                    // During the free campaign nothing is collected: store 0 as the
                    // paid amount and keep the list price in raw for "struck-through 0".
                    const paidAmount = PROMO_FREE ? 0 : listAmount;
                    const paidVat = PROMO_FREE ? 0 : listVat;
                    const raw = PROMO_FREE
                        ? JSON.stringify({ promo: true, listAmount, listVat, currency: sub.currency || 'TRY' })
                        : null;
                    await sql`
                        INSERT INTO payments
                            (subscription_id, user_id, company_id, amount, currency, vat_rate, vat_amount,
                             status, provider, kind, raw, paid_at)
                        VALUES
                            (${id}, ${sub.user_id || null}, ${sub.company_id || null}, ${paidAmount},
                             ${sub.currency || 'TRY'}, ${vatRate}, ${paidVat}, 'paid', 'manual', 'subscription',
                             ${raw}, NOW())`;
                }
                return json(res, 200, { ok: true });
            }
            if (action === 'reject') {
                await sql`UPDATE subscriptions SET status = 'canceled', updated_at = NOW() WHERE id = ${id}`;
                return json(res, 200, { ok: true });
            }
            return json(res, 400, { error: 'bad_action' });
        } catch (e) {
            console.error('admin/subscriptions POST', e);
            return json(res, 500, { error: 'server_error' });
        }
    }

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
                SELECT p.id, p.amount, p.currency, p.vat_amount, p.status, p.kind, p.provider,
                       p.provider_ref, p.invoice_no, p.raw, p.paid_at, p.created_at,
                       u.email AS user_email, c.name AS company_name
                FROM payments p
                LEFT JOIN users u ON u.id = p.user_id
                LEFT JOIN companies c ON c.id = p.company_id
                ORDER BY p.created_at DESC LIMIT 500`;
            return json(res, 200, { payments: rows });
        }

        // default: subscriptions list. Pending requests sort to the top so the
        // admin sees what needs approval first; contact fields (email/phone)
        // are included so they can reach out before granting access.
        const rows = await sql`
            SELECT s.id, s.owner_type, s.plan, s.period, s.tier, s.currency, s.amount, s.status,
                   s.current_period_start, s.current_period_end, s.cancel_at_period_end, s.created_at,
                   u.email AS user_email, u.first_name, u.last_name, u.phone, c.name AS company_name
            FROM subscriptions s
            LEFT JOIN users u ON u.id = s.user_id
            LEFT JOIN companies c ON c.id = s.company_id
            ORDER BY (CASE WHEN s.status = 'pending' THEN 0 ELSE 1 END), s.created_at DESC
            LIMIT 500`;
        return json(res, 200, { subscriptions: rows });
    } catch (e) {
        console.error('admin/subscriptions', e);
        return json(res, 500, { error: 'server_error' });
    }
}
