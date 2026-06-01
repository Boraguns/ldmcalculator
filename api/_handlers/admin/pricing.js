// Admin pricing management.
//   GET    /api/admin/pricing            → all pricing rows
//   PUT    /api/admin/pricing            → upsert one row (plan,tier,period,currency,amount,vat_rate,active)
//   DELETE /api/admin/pricing?id=<id>    → remove a row
import { sql, json, requireAdmin, readJsonBody } from '../../_lib/db.js';

const PLANS = ['individual', 'corporate'];
const PERIODS = ['monthly', 'yearly'];
const CURRENCIES = ['TRY', 'USD', 'EUR'];
const CORP_TIERS = [3, 5, 10, 20, 30, 50, 100];

export default async function handler(req, res) {
    if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
    try {
        if (req.method === 'GET') {
            const rows = await sql`
                SELECT id, plan, tier, period, currency, amount, vat_rate, active, updated_at
                FROM pricing ORDER BY plan, COALESCE(tier, -1), period, currency`;
            return json(res, 200, { pricing: rows });
        }

        if (req.method === 'PUT') {
            const b = await readJsonBody(req);
            const plan = PLANS.includes(b.plan) ? b.plan : null;
            const period = PERIODS.includes(b.period) ? b.period : null;
            const currency = CURRENCIES.includes(b.currency) ? b.currency : null;
            if (!plan || !period || !currency) return json(res, 400, { error: 'invalid_combo' });
            const tier = plan === 'corporate'
                ? (CORP_TIERS.includes(parseInt(b.tier, 10)) ? parseInt(b.tier, 10) : null)
                : null;
            if (plan === 'corporate' && tier == null) return json(res, 400, { error: 'invalid_tier' });
            const amount = Number(b.amount) || 0;
            const vat = b.vat_rate != null ? Number(b.vat_rate) : 20;
            const active = b.active !== false;

            const rows = await sql`
                INSERT INTO pricing (plan, tier, period, currency, amount, vat_rate, active, updated_at)
                VALUES (${plan}, ${tier}, ${period}, ${currency}, ${amount}, ${vat}, ${active}, NOW())
                ON CONFLICT (plan, COALESCE(tier, -1), period, currency)
                DO UPDATE SET amount = ${amount}, vat_rate = ${vat}, active = ${active}, updated_at = NOW()
                RETURNING id, plan, tier, period, currency, amount, vat_rate, active`;
            return json(res, 200, { row: rows[0] });
        }

        if (req.method === 'DELETE') {
            const id = parseInt(req.query?.id, 10);
            if (!id) return json(res, 400, { error: 'missing_id' });
            await sql`DELETE FROM pricing WHERE id = ${id}`;
            return json(res, 200, { ok: true });
        }

        return json(res, 405, { error: 'method_not_allowed' });
    } catch (e) {
        console.error('admin/pricing', e);
        return json(res, 500, { error: 'server_error' });
    }
}
