// End-user auth — one serverless function, routed by /api/auth/<action>.
//   register · login · verify-email · request-reset · reset-password · me · logout
import { sql, json, readJsonBody, clientIp } from '../_lib/db.js';
import {
    hashPassword, comparePassword, signUserToken, randomToken,
    requireUser, serializeCookie, appendCookie,
} from '../_lib/userauth.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../_lib/mailer.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOUR = 3600 * 1000;

const setAuthCookie = (res, token) =>
    appendCookie(res, serializeCookie('ldm_token', token, { maxAge: 60 * 60 * 24 * 30 }));

const publicUser = (u) => ({
    id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name,
    phone: u.phone, accountType: u.account_type, companyId: u.company_id,
    emailVerified: u.email_verified,
});

async function recordConsents(userId, consents, req) {
    const ip = clientIp(req);
    const ua = (req.headers['user-agent'] || '').slice(0, 500);
    const types = Array.isArray(consents) ? consents : ['kvkk', 'terms', 'explicit'];
    for (const type of types) {
        await sql`INSERT INTO consents (user_id, type, version, ip, user_agent)
                  VALUES (${userId}, ${type}, '1.0', ${ip}, ${ua})`;
    }
}

// --- register --------------------------------------------------------------
async function register(req, res) {
    const b = await readJsonBody(req);
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    const firstName = String(b.firstName || '').trim().slice(0, 80);
    const lastName = String(b.lastName || '').trim().slice(0, 80);
    const phone = String(b.phone || '').trim().slice(0, 40);

    if (!EMAIL_RE.test(email)) return json(res, 400, { error: 'invalid_email' });
    if (password.length < 8) return json(res, 400, { error: 'weak_password' });
    if (!firstName || !lastName) return json(res, 400, { error: 'name_required' });
    if (!b.acceptKvkk || !b.acceptTerms) return json(res, 400, { error: 'consent_required' });

    const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (existing[0]) return json(res, 409, { error: 'email_taken' });

    const hash = await hashPassword(password);
    const rows = await sql`
        INSERT INTO users (email, password_hash, first_name, last_name, phone, account_type)
        VALUES (${email}, ${hash}, ${firstName}, ${lastName}, ${phone}, 'individual')
        RETURNING id, email, first_name, last_name, phone, account_type, company_id, email_verified`;
    const user = rows[0];

    const consents = ['kvkk', 'terms', 'explicit'];
    if (b.acceptMarketing) consents.push('marketing');
    await recordConsents(user.id, consents, req);

    // Email verification token (24h)
    const token = randomToken();
    await sql`INSERT INTO email_tokens (user_id, token, type, expires_at)
              VALUES (${user.id}, ${token}, 'verify', ${new Date(Date.now() + 24 * HOUR).toISOString()})`;
    try { await sendVerificationEmail(email, token); } catch (e) { console.error('verify mail', e); }

    const jwtTok = signUserToken({ id: user.id, email: user.email });
    setAuthCookie(res, jwtTok);
    return json(res, 200, { token: jwtTok, user: publicUser(user), needsVerification: true });
}

// --- login -----------------------------------------------------------------
async function login(req, res) {
    const b = await readJsonBody(req);
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    if (!email || !password) return json(res, 400, { error: 'missing_credentials' });

    const rows = await sql`
        SELECT id, email, password_hash, first_name, last_name, phone, account_type,
               company_id, email_verified, status
        FROM users WHERE email = ${email} LIMIT 1`;
    const u = rows[0];
    if (!u || u.status !== 'active') return json(res, 401, { error: 'invalid_credentials' });
    const ok = await comparePassword(password, u.password_hash);
    if (!ok) return json(res, 401, { error: 'invalid_credentials' });

    const token = signUserToken({ id: u.id, email: u.email });
    setAuthCookie(res, token);
    return json(res, 200, { token, user: publicUser(u) });
}

// --- verify-email ----------------------------------------------------------
async function verifyEmail(req, res) {
    const b = await readJsonBody(req);
    const token = String(b.token || '').trim();
    if (!token) return json(res, 400, { error: 'missing_token' });
    const rows = await sql`
        SELECT id, user_id, expires_at, used_at FROM email_tokens
        WHERE token = ${token} AND type = 'verify' LIMIT 1`;
    const t = rows[0];
    if (!t || t.used_at || new Date(t.expires_at) < new Date())
        return json(res, 400, { error: 'invalid_or_expired' });
    await sql`UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = ${t.user_id}`;
    await sql`UPDATE email_tokens SET used_at = NOW() WHERE id = ${t.id}`;
    return json(res, 200, { ok: true });
}

// --- resend-verify ---------------------------------------------------------
// Re-issues a verification email for the logged-in user (if not yet verified).
async function resendVerify(req, res) {
    const u = await requireUser(req);
    if (!u) return json(res, 401, { error: 'unauthorized' });
    if (u.email_verified) return json(res, 200, { ok: true, alreadyVerified: true });

    // Invalidate any outstanding verify tokens, then issue a fresh one (24h).
    await sql`UPDATE email_tokens SET used_at = NOW()
              WHERE user_id = ${u.id} AND type = 'verify' AND used_at IS NULL`;
    const token = randomToken();
    await sql`INSERT INTO email_tokens (user_id, token, type, expires_at)
              VALUES (${u.id}, ${token}, 'verify', ${new Date(Date.now() + 24 * HOUR).toISOString()})`;
    try { await sendVerificationEmail(u.email, token); } catch (e) { console.error('resend verify mail', e); }
    return json(res, 200, { ok: true });
}

// --- request-reset ---------------------------------------------------------
async function requestReset(req, res) {
    const b = await readJsonBody(req);
    const email = String(b.email || '').trim().toLowerCase();
    if (EMAIL_RE.test(email)) {
        const rows = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
        if (rows[0]) {
            const token = randomToken();
            await sql`INSERT INTO email_tokens (user_id, token, type, expires_at)
                      VALUES (${rows[0].id}, ${token}, 'reset', ${new Date(Date.now() + HOUR).toISOString()})`;
            try { await sendPasswordResetEmail(email, token); } catch (e) { console.error('reset mail', e); }
        }
    }
    // Always ok — never reveal whether an email exists.
    return json(res, 200, { ok: true });
}

// --- reset-password --------------------------------------------------------
async function resetPassword(req, res) {
    const b = await readJsonBody(req);
    const token = String(b.token || '').trim();
    const password = String(b.password || '');
    if (!token || password.length < 8) return json(res, 400, { error: 'invalid_input' });
    const rows = await sql`
        SELECT id, user_id, expires_at, used_at FROM email_tokens
        WHERE token = ${token} AND type = 'reset' LIMIT 1`;
    const t = rows[0];
    if (!t || t.used_at || new Date(t.expires_at) < new Date())
        return json(res, 400, { error: 'invalid_or_expired' });
    const hash = await hashPassword(password);
    await sql`UPDATE users SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${t.user_id}`;
    await sql`UPDATE email_tokens SET used_at = NOW() WHERE id = ${t.id}`;
    return json(res, 200, { ok: true });
}

// --- me --------------------------------------------------------------------
async function me(req, res) {
    const u = await requireUser(req);
    if (!u) return json(res, 401, { error: 'unauthorized' });
    // Active subscription (own or via company). Pending manual requests are
    // also surfaced (so the account page can show "awaiting approval"), but an
    // active/past_due one always wins via the CASE ordering below.
    const subs = await sql`
        SELECT id, plan, period, tier, currency, amount, status,
               current_period_end, cancel_at_period_end
        FROM subscriptions
        WHERE status IN ('active','past_due','pending')
          AND (user_id = ${u.id} ${u.company_id ? sql`OR company_id = ${u.company_id}` : sql``})
        ORDER BY (CASE WHEN status IN ('active','past_due') THEN 0 ELSE 1 END),
                 current_period_end DESC NULLS LAST LIMIT 1`;
    return json(res, 200, { user: publicUser(u), subscription: subs[0] || null });
}

// --- logout ----------------------------------------------------------------
async function logout(req, res) {
    appendCookie(res, serializeCookie('ldm_token', '', { maxAge: 0 }));
    return json(res, 200, { ok: true });
}

const ACTIONS = {
    'register': register,
    'login': login,
    'verify-email': verifyEmail,
    'resend-verify': resendVerify,
    'request-reset': requestReset,
    'reset-password': resetPassword,
    'me': me,
    'logout': logout,
};

export default async function handler(req, res) {
    const action = (req.query?.action || '').toString();
    const fn = ACTIONS[action];
    if (!fn) return json(res, 404, { error: 'not_found' });
    try {
        return await fn(req, res);
    } catch (e) {
        console.error('auth/' + action, e);
        return json(res, 500, { error: 'server_error' });
    }
}
