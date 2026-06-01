// Corporate account API — routed by /api/company/<resource>.
//   create        · POST public; registers a company + its admin user (returns JWT)
//   members       · GET list seats · DELETE remove a member (admin only)
//   invite        · POST invite a member by email (admin only, respects seat cap)
//   accept-invite · POST accept an emailed invite (creates the member user)
//   change-seats  · POST upgrade seat tier with mid-cycle proration (admin only)
import { sql, json, readJsonBody, clientIp } from '../_lib/db.js';
import {
    hashPassword, signUserToken, randomToken, requireUser,
    serializeCookie, appendCookie,
} from '../_lib/userauth.js';
import { sendCompanyInviteEmail, sendVerificationEmail } from '../_lib/mailer.js';
import { CORP_TIERS, computeSeatProration, getPrice, vatBreakdown } from '../_lib/pricing.js';
import { paytrConfigured, createIframeToken, newMerchantOid } from '../_lib/paytr.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOUR = 3600 * 1000;

const setAuthCookie = (res, token) =>
    appendCookie(res, serializeCookie('ldm_token', token, { maxAge: 60 * 60 * 24 * 30 }));

const publicUser = (u) => ({
    id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name,
    phone: u.phone, accountType: u.account_type, companyId: u.company_id, emailVerified: u.email_verified,
});

async function recordConsents(userId, consents, req) {
    const ip = clientIp(req);
    const ua = (req.headers['user-agent'] || '').slice(0, 500);
    for (const type of consents) {
        await sql`INSERT INTO consents (user_id, type, version, ip, user_agent) VALUES (${userId}, ${type}, '1.0', ${ip}, ${ua})`;
    }
}

// --- create ----------------------------------------------------------------
async function create(req, res) {
    const b = await readJsonBody(req);
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    const firstName = String(b.firstName || '').trim().slice(0, 80);
    const lastName = String(b.lastName || '').trim().slice(0, 80);
    const phone = String(b.phone || '').trim().slice(0, 40);
    const companyName = String(b.companyName || '').trim().slice(0, 200);

    if (!EMAIL_RE.test(email)) return json(res, 400, { error: 'invalid_email' });
    if (password.length < 8) return json(res, 400, { error: 'weak_password' });
    if (!firstName || !lastName) return json(res, 400, { error: 'name_required' });
    if (!companyName) return json(res, 400, { error: 'company_required' });
    if (!b.acceptKvkk || !b.acceptTerms) return json(res, 400, { error: 'consent_required' });

    const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (existing[0]) return json(res, 409, { error: 'email_taken' });

    // Company first (seat default 3), then admin user, then back-link admin.
    const companyRows = await sql`
        INSERT INTO companies (name, tax_number, tax_office, address, country, seat_count)
        VALUES (${companyName}, ${String(b.taxNumber || '').slice(0, 40)}, ${String(b.taxOffice || '').slice(0, 120)},
                ${String(b.address || '').slice(0, 400)}, ${String(b.country || 'TR').slice(0, 4)}, 3)
        RETURNING id`;
    const companyId = companyRows[0].id;

    const hash = await hashPassword(password);
    const userRows = await sql`
        INSERT INTO users (email, password_hash, first_name, last_name, phone, account_type, company_id)
        VALUES (${email}, ${hash}, ${firstName}, ${lastName}, ${phone}, 'corporate_admin', ${companyId})
        RETURNING id, email, first_name, last_name, phone, account_type, company_id, email_verified`;
    const user = userRows[0];

    await sql`UPDATE companies SET admin_user_id = ${user.id} WHERE id = ${companyId}`;

    const consents = ['kvkk', 'terms', 'explicit'];
    if (b.acceptMarketing) consents.push('marketing');
    await recordConsents(user.id, consents, req);

    const token = randomToken();
    await sql`INSERT INTO email_tokens (user_id, token, type, expires_at)
              VALUES (${user.id}, ${token}, 'verify', ${new Date(Date.now() + 24 * HOUR).toISOString()})`;
    try { await sendVerificationEmail(email, token); } catch (e) { console.error('verify mail', e); }

    const jwtTok = signUserToken({ id: user.id, email: user.email });
    setAuthCookie(res, jwtTok);
    return json(res, 200, { token: jwtTok, user: publicUser(user), companyId, needsVerification: true });
}

// --- members ---------------------------------------------------------------
async function members(req, res) {
    const user = await requireUser(req);
    if (!user || !user.company_id) return json(res, 403, { error: 'not_company' });

    if (req.method === 'DELETE') {
        if (user.account_type !== 'corporate_admin') return json(res, 403, { error: 'not_company_admin' });
        const id = parseInt(req.query?.id, 10);
        if (!id) return json(res, 400, { error: 'missing_id' });
        // Never let an admin remove themselves via this path.
        if (id === user.id) return json(res, 400, { error: 'cannot_remove_self' });
        await sql`UPDATE users SET company_id = NULL, account_type = 'individual', updated_at = NOW()
                  WHERE id = ${id} AND company_id = ${user.company_id} AND account_type <> 'corporate_admin'`;
        return json(res, 200, { ok: true });
    }

    const company = await sql`SELECT id, name, tax_number, address, seat_count FROM companies WHERE id = ${user.company_id} LIMIT 1`;
    const rows = await sql`
        SELECT id, email, first_name, last_name, account_type, status
        FROM users WHERE company_id = ${user.company_id} ORDER BY account_type DESC, created_at ASC`;
    const invites = await sql`
        SELECT id, email, status, created_at, expires_at FROM company_invites
        WHERE company_id = ${user.company_id} AND status = 'pending' ORDER BY created_at DESC`;
    return json(res, 200, { company: company[0] || null, members: rows, invites });
}

// --- invite ----------------------------------------------------------------
async function invite(req, res) {
    const user = await requireUser(req);
    if (!user || user.account_type !== 'corporate_admin' || !user.company_id)
        return json(res, 403, { error: 'not_company_admin' });
    const b = await readJsonBody(req);
    const email = String(b.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return json(res, 400, { error: 'invalid_email' });

    const company = await sql`SELECT name, seat_count FROM companies WHERE id = ${user.company_id} LIMIT 1`;
    const seatCount = company[0]?.seat_count || 0;
    const memberCount = await sql`SELECT COUNT(*)::int AS n FROM users WHERE company_id = ${user.company_id} AND status = 'active'`;
    const pendingCount = await sql`SELECT COUNT(*)::int AS n FROM company_invites WHERE company_id = ${user.company_id} AND status = 'pending'`;
    if ((memberCount[0].n + pendingCount[0].n) >= seatCount)
        return json(res, 409, { error: 'no_seats_available' });

    const dup = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (dup[0]) return json(res, 409, { error: 'email_taken' });

    const token = randomToken();
    await sql`INSERT INTO company_invites (company_id, email, token, role, invited_by, expires_at)
              VALUES (${user.company_id}, ${email}, ${token}, 'member', ${user.id},
                      ${new Date(Date.now() + 7 * 24 * HOUR).toISOString()})`;
    try { await sendCompanyInviteEmail(email, token, company[0]?.name || 'LDMCalculator'); }
    catch (e) { console.error('invite mail', e); }
    return json(res, 200, { ok: true });
}

// --- accept-invite ---------------------------------------------------------
async function acceptInvite(req, res) {
    const b = await readJsonBody(req);
    const token = String(b.token || '').trim();
    const password = String(b.password || '');
    const firstName = String(b.firstName || '').trim().slice(0, 80);
    const lastName = String(b.lastName || '').trim().slice(0, 80);
    if (!token) return json(res, 400, { error: 'missing_token' });
    if (password.length < 8) return json(res, 400, { error: 'weak_password' });
    if (!firstName || !lastName) return json(res, 400, { error: 'name_required' });

    const invRows = await sql`SELECT id, company_id, email, status, expires_at FROM company_invites WHERE token = ${token} LIMIT 1`;
    const inv = invRows[0];
    if (!inv || inv.status !== 'pending' || new Date(inv.expires_at) < new Date())
        return json(res, 400, { error: 'invalid_or_expired' });

    const dup = await sql`SELECT id FROM users WHERE email = ${inv.email} LIMIT 1`;
    if (dup[0]) return json(res, 409, { error: 'email_taken' });

    const hash = await hashPassword(password);
    const userRows = await sql`
        INSERT INTO users (email, password_hash, first_name, last_name, account_type, company_id, email_verified)
        VALUES (${inv.email}, ${hash}, ${firstName}, ${lastName}, 'corporate_member', ${inv.company_id}, TRUE)
        RETURNING id, email, first_name, last_name, phone, account_type, company_id, email_verified`;
    const user = userRows[0];
    await sql`UPDATE company_invites SET status = 'accepted', accepted_at = NOW() WHERE id = ${inv.id}`;
    await recordConsents(user.id, ['kvkk', 'terms', 'explicit'], req);

    const jwtTok = signUserToken({ id: user.id, email: user.email });
    setAuthCookie(res, jwtTok);
    return json(res, 200, { token: jwtTok, user: publicUser(user) });
}

// --- change-seats (proration) ----------------------------------------------
async function changeSeats(req, res) {
    const user = await requireUser(req);
    if (!user || user.account_type !== 'corporate_admin' || !user.company_id)
        return json(res, 403, { error: 'not_company_admin' });
    const b = await readJsonBody(req);
    const newTier = parseInt(b.tier, 10);
    if (!CORP_TIERS.includes(newTier)) return json(res, 400, { error: 'invalid_tier' });

    const company = await sql`SELECT seat_count FROM companies WHERE id = ${user.company_id} LIMIT 1`;
    const oldTier = company[0]?.seat_count || 3;

    const subRows = await sql`
        SELECT id, period, currency, current_period_start, current_period_end
        FROM subscriptions
        WHERE company_id = ${user.company_id} AND status IN ('active','past_due')
        ORDER BY current_period_end DESC NULLS LAST LIMIT 1`;
    const sub = subRows[0];

    // Downgrade or no active sub: just adjust the seat cap (no charge). For a
    // downgrade we don't refund automatically — seats simply shrink at renewal.
    if (!sub || newTier <= oldTier) {
        await sql`UPDATE companies SET seat_count = ${newTier}, updated_at = NOW() WHERE id = ${user.company_id}`;
        return json(res, 200, { ok: true, proration: { amount: 0, oldTier, newTier } });
    }

    const pr = await computeSeatProration({
        oldTier, newTier, period: sub.period, currency: sub.currency,
        periodStart: sub.current_period_start, periodEnd: sub.current_period_end,
    });

    // If the prorated charge rounds to zero (almost no time left), just bump.
    if (!pr.amount || pr.amount <= 0) {
        await sql`UPDATE companies SET seat_count = ${newTier}, updated_at = NOW() WHERE id = ${user.company_id}`;
        await sql`UPDATE subscriptions SET tier = ${newTier}, updated_at = NOW() WHERE id = ${sub.id}`;
        return json(res, 200, { ok: true, proration: pr });
    }

    if (!paytrConfigured()) return json(res, 503, { error: 'payments_unavailable' });

    // Charge the prorated difference via a one-off PayTR payment. The seat cap
    // is bumped only after the callback marks this payment paid (kind=proration).
    const merchantOid = newMerchantOid('PRO');
    const { vat } = vatBreakdown(pr.amount, pr.vatRate);
    await sql`
        INSERT INTO payments (subscription_id, user_id, company_id, amount, currency, vat_rate, vat_amount,
                              status, provider, provider_ref, kind, raw)
        VALUES (${sub.id}, ${user.id}, ${user.company_id}, ${pr.amount}, ${sub.currency}, ${pr.vatRate}, ${vat},
                'pending', 'paytr', ${merchantOid}, 'proration', ${JSON.stringify({ newTier, oldTier, pr })})`;

    const tok = await createIframeToken({
        merchantOid, email: user.email, amount: pr.amount, currency: sub.currency,
        userName: `${user.first_name} ${user.last_name}`.trim() || user.email,
        userPhone: user.phone || '-', userIp: clientIp(req),
        basket: [[`Seat upgrade ${oldTier}→${newTier}`, String(pr.amount), 1]],
        recurring: false, lang: (b.lang || 'tr'),
    });
    if (!tok.ok) {
        await sql`UPDATE payments SET status = 'failed' WHERE provider_ref = ${merchantOid}`;
        return json(res, 502, { error: 'paytr_token_failed', reason: tok.reason });
    }
    return json(res, 200, {
        proration: pr, merchantOid,
        iframeUrl: `https://www.paytr.com/odeme/guvenli/${tok.token}`, token: tok.token,
    });
}

const RESOURCES = {
    'create': create,
    'members': members,
    'invite': invite,
    'accept-invite': acceptInvite,
    'change-seats': changeSeats,
};

export default async function handler(req, res) {
    const resource = (req.query?.resource || '').toString();
    const fn = RESOURCES[resource];
    if (!fn) return json(res, 404, { error: 'not_found' });
    try {
        return await fn(req, res);
    } catch (e) {
        console.error('company/' + resource, e);
        return json(res, 500, { error: 'server_error' });
    }
}
