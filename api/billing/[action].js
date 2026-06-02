// Subscription billing — routed by /api/billing/<action>.
//   plans    · GET  public price list for a currency
//   checkout · POST authed; create pending sub+payment, return a PayTR iframe token
//   callback · POST server-to-server from PayTR (form-encoded); activates the sub
//   cancel   · POST authed; flag cancel-at-period-end
import { sql, json, readJsonBody, clientIp } from '../_lib/db.js';
import { requireUser } from '../_lib/userauth.js';
import {
    listPrices, getPrice, isCurrency, isPeriod, CORP_TIERS, periodEnd, vatBreakdown,
} from '../_lib/pricing.js';
import {
    paytrConfigured, createIframeToken, verifyCallbackHash, newMerchantOid,
} from '../_lib/paytr.js';

// The subscriptions table predates the manual-approval flow, so add the
// `provider` marker column on demand (guarded so warm invocations skip it).
// 'paytr' is the default; manual requests are tagged 'manual'.
let providerColEnsured = false;
async function ensureProviderColumn() {
    if (providerColEnsured) return;
    await sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'paytr'`;
    providerColEnsured = true;
}

// PayTR posts application/x-www-form-urlencoded — parse that, not JSON.
const readFormBody = (req) => new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
        const out = {};
        new URLSearchParams(data).forEach((v, k) => { out[k] = v; });
        resolve(out);
    });
    req.on('error', () => resolve({}));
});

// --- plans -----------------------------------------------------------------
async function plans(req, res) {
    const currency = (req.query?.currency || '').toString().toUpperCase();
    const rows = await listPrices(isCurrency(currency) ? currency : null);
    return json(res, 200, { plans: rows });
}

// --- checkout --------------------------------------------------------------
async function checkout(req, res) {
    const user = await requireUser(req);
    if (!user) return json(res, 401, { error: 'unauthorized' });
    const b = await readJsonBody(req);

    const plan = b.plan === 'corporate' ? 'corporate' : 'individual';
    const period = isPeriod(b.period) ? b.period : 'monthly';
    const currency = isCurrency((b.currency || '').toUpperCase()) ? b.currency.toUpperCase() : 'TRY';
    let tier = null;
    if (plan === 'corporate') {
        tier = parseInt(b.tier, 10);
        if (!CORP_TIERS.includes(tier)) return json(res, 400, { error: 'invalid_tier' });
        // Only a corporate admin may buy a corporate plan for their company.
        if (user.account_type !== 'corporate_admin' || !user.company_id)
            return json(res, 403, { error: 'not_company_admin' });
    }

    const price = await getPrice({ plan, tier, period, currency });
    if (!price) return json(res, 400, { error: 'price_unavailable' });

    const ownerType = plan === 'corporate' ? 'company' : 'user';

    // ---- Manual-approval fallback (while PayTR is not configured) ----------
    // Record the subscription as a pending request for an admin to approve from
    // the panel. The moment PayTR env vars are set, paytrConfigured() flips to
    // true and this branch is skipped — the normal iframe flow below runs with
    // no code changes needed.
    if (!paytrConfigured()) {
        await ensureProviderColumn();
        const ownerMatch = ownerType === 'user'
            ? sql`user_id = ${user.id}`
            : sql`company_id = ${user.company_id}`;
        // Reuse an open request instead of stacking duplicates.
        const existing = await sql`
            SELECT id FROM subscriptions
            WHERE status = 'pending' AND provider = 'manual' AND ${ownerMatch}
            ORDER BY created_at DESC LIMIT 1`;
        let subId;
        if (existing[0]) {
            subId = existing[0].id;
            await sql`
                UPDATE subscriptions
                SET plan = ${plan}, period = ${period}, tier = ${tier},
                    currency = ${currency}, amount = ${price.amount}, updated_at = NOW()
                WHERE id = ${subId}`;
        } else {
            const rows = await sql`
                INSERT INTO subscriptions (owner_type, user_id, company_id, plan, period, tier, currency, amount, status, provider)
                VALUES (${ownerType}, ${ownerType === 'user' ? user.id : null}, ${ownerType === 'company' ? user.company_id : null},
                        ${plan}, ${period}, ${tier}, ${currency}, ${price.amount}, 'pending', 'manual')
                RETURNING id`;
            subId = rows[0].id;
        }
        return json(res, 200, { pending: true, manual: true, subscriptionId: subId });
    }

    const merchantOid = newMerchantOid();
    const { vat } = vatBreakdown(price.amount, price.vat_rate);

    // Create the pending subscription + payment up front; the callback flips
    // them to active/paid once PayTR confirms.
    const subRows = await sql`
        INSERT INTO subscriptions (owner_type, user_id, company_id, plan, period, tier, currency, amount, status)
        VALUES (${ownerType}, ${ownerType === 'user' ? user.id : null}, ${ownerType === 'company' ? user.company_id : null},
                ${plan}, ${period}, ${tier}, ${currency}, ${price.amount}, 'pending')
        RETURNING id`;
    const subId = subRows[0].id;

    await sql`
        INSERT INTO payments (subscription_id, user_id, company_id, amount, currency, vat_rate, vat_amount,
                              status, provider, provider_ref, kind)
        VALUES (${subId}, ${user.id}, ${ownerType === 'company' ? user.company_id : null},
                ${price.amount}, ${currency}, ${price.vat_rate}, ${vat},
                'pending', 'paytr', ${merchantOid}, 'subscription')`;

    const tok = await createIframeToken({
        merchantOid,
        email: user.email,
        amount: price.amount,
        currency,
        userName: `${user.first_name} ${user.last_name}`.trim() || user.email,
        userPhone: user.phone || '-',
        userIp: clientIp(req),
        basket: [[`LDMCalculator ${plan} ${period}`, String(price.amount), 1]],
        recurring: true,
        lang: (b.lang || 'tr'),
    });
    if (!tok.ok) {
        await sql`UPDATE payments SET status = 'failed', raw = ${JSON.stringify({ reason: tok.reason })} WHERE provider_ref = ${merchantOid}`;
        return json(res, 502, { error: 'paytr_token_failed', reason: tok.reason });
    }

    return json(res, 200, {
        token: tok.token,
        iframeUrl: `https://www.paytr.com/odeme/guvenli/${tok.token}`,
        merchantOid, subscriptionId: subId,
    });
}

// --- callback (PayTR → us) -------------------------------------------------
async function callback(req, res) {
    const body = await readFormBody(req);
    if (!verifyCallbackHash(body)) {
        res.statusCode = 400;
        return res.end('PAYTR notification failed: bad hash');
    }
    const { merchant_oid, status, total_amount } = body;

    const payRows = await sql`SELECT id, subscription_id, company_id, kind, raw FROM payments WHERE provider_ref = ${merchant_oid} LIMIT 1`;
    const pay = payRows[0];
    if (!pay) { return res.end('OK'); } // unknown oid — ack so PayTR stops retrying

    if (status === 'success') {
        await sql`UPDATE payments SET status = 'paid', paid_at = NOW(),
                  raw = ${JSON.stringify(body)} WHERE id = ${pay.id}`;
        if (pay.kind === 'proration') {
            // Seat upgrade: bump the company cap + subscription tier now that the
            // prorated difference is paid. newTier is stashed in payments.raw.
            const newTier = pay.raw?.newTier;
            if (pay.company_id && newTier) {
                await sql`UPDATE companies SET seat_count = ${newTier}, updated_at = NOW() WHERE id = ${pay.company_id}`;
                if (pay.subscription_id)
                    await sql`UPDATE subscriptions SET tier = ${newTier}, updated_at = NOW() WHERE id = ${pay.subscription_id}`;
            }
        } else if (pay.subscription_id) {
            const subRows = await sql`SELECT period FROM subscriptions WHERE id = ${pay.subscription_id} LIMIT 1`;
            const period = subRows[0]?.period || 'monthly';
            const start = new Date();
            const end = periodEnd(start, period);
            await sql`
                UPDATE subscriptions
                SET status = 'active', current_period_start = ${start.toISOString()},
                    current_period_end = ${end.toISOString()}, updated_at = NOW()
                WHERE id = ${pay.subscription_id}`;
        }
    } else {
        await sql`UPDATE payments SET status = 'failed', raw = ${JSON.stringify(body)} WHERE id = ${pay.id}`;
    }
    // PayTR requires a literal "OK" so it stops resending the notification.
    return res.end('OK');
}

// --- cancel ----------------------------------------------------------------
async function cancel(req, res) {
    const user = await requireUser(req);
    if (!user) return json(res, 401, { error: 'unauthorized' });
    await sql`
        UPDATE subscriptions SET cancel_at_period_end = TRUE, updated_at = NOW()
        WHERE status IN ('active','past_due')
          AND (user_id = ${user.id} ${user.company_id ? sql`OR company_id = ${user.company_id}` : sql``})`;
    return json(res, 200, { ok: true });
}

const ACTIONS = { plans, checkout, callback, cancel };

export default async function handler(req, res) {
    const action = (req.query?.action || '').toString();
    const fn = ACTIONS[action];
    if (!fn) return json(res, 404, { error: 'not_found' });
    try {
        return await fn(req, res);
    } catch (e) {
        console.error('billing/' + action, e);
        // For the PayTR callback, never 500 — it would trigger endless retries.
        if (action === 'callback') { res.statusCode = 200; return res.end('OK'); }
        return json(res, 500, { error: 'server_error' });
    }
}
