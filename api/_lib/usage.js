// Free-tier usage metering. A "service" is one stacking run OR one tool
// document. Limits are a DAILY allowance that resets every day at 00:00 Turkey
// time (Europe/Istanbul), shared across both kinds, forming a sign-up →
// subscribe funnel:
//   • anonymous visitor      → 2 / day  (tracked by IP + signed cookie + fingerprint) → register
//   • free registered user   → 2 / day  (tracked by user_id)                          → subscribe
//   • active paid subscriber → unlimited
import { sql } from './db.js';
import { getOrSetAnonId, hashId, clientIp } from './userauth.js';

export const ANON_LIMIT = 2;
export const FREE_LIMIT = 2;

// Only count events from "today" in Turkey local time, so the allowance resets
// at Istanbul midnight regardless of the database server's timezone.
const TODAY_TR = sql`(created_at AT TIME ZONE 'Europe/Istanbul')::date = (NOW() AT TIME ZONE 'Europe/Istanbul')::date`;

// True if the user (or their company) has a usable, non-expired subscription.
export async function hasActiveSubscription(user) {
    if (!user) return false;
    const rows = await sql`
        SELECT 1 FROM subscriptions
        WHERE status IN ('active', 'past_due')
          AND (current_period_end IS NULL OR current_period_end > NOW())
          AND (user_id = ${user.id} ${user.company_id ? sql`OR company_id = ${user.company_id}` : sql``})
        LIMIT 1`;
    return !!rows[0];
}

// Daily counts (today in Turkey time) — the allowance refills every midnight, so
// an exhausted visitor is pushed to register / subscribe until the next day.
async function anonCount({ ip, cookieId, fp }) {
    const rows = await sql`
        SELECT COUNT(*)::int AS n FROM usage_events
        WHERE user_id IS NULL
          AND ${TODAY_TR}
          AND ( (ip <> '' AND ip = ${ip})
             OR (cookie_id <> '' AND cookie_id = ${cookieId})
             OR (fingerprint <> '' AND fingerprint = ${fp}) )`;
    return rows[0]?.n || 0;
}

async function userCount(userId) {
    const rows = await sql`
        SELECT COUNT(*)::int AS n FROM usage_events
        WHERE user_id = ${userId}
          AND ${TODAY_TR}`;
    return rows[0]?.n || 0;
}

// Resolve the caller's identity + current quota status. Does NOT consume.
// `user` is the result of requireUser(req) (may be null). `fp` is the optional
// client fingerprint sent from the browser.
export async function getUsageStatus(req, res, user, fp = '') {
    const ip = hashId(clientIp(req));
    const cookieId = getOrSetAnonId(req, res);
    const fingerprint = fp ? hashId(fp) : '';

    if (user) {
        const paid = await hasActiveSubscription(user);
        if (paid) {
            return { tier: 'paid', unlimited: true, limit: null, used: 0, remaining: null,
                     ip, cookieId, fingerprint, userId: user.id };
        }
        const used = await userCount(user.id);
        return { tier: 'free', unlimited: false, limit: FREE_LIMIT, used,
                 remaining: Math.max(0, FREE_LIMIT - used),
                 ip, cookieId, fingerprint, userId: user.id };
    }

    const used = await anonCount({ ip, cookieId, fp: fingerprint });
    return { tier: 'anon', unlimited: false, limit: ANON_LIMIT, used,
             remaining: Math.max(0, ANON_LIMIT - used),
             ip, cookieId, fingerprint, userId: null };
}

// Record a usage event after confirming there's quota. Returns the post-consume
// status, or { blocked: true, ...status } when the limit is already reached.
export async function consumeUsage(req, res, user, { kind, tool, fp = '', meta = null }) {
    const status = await getUsageStatus(req, res, user, fp);
    if (!status.unlimited && status.remaining <= 0) {
        return { blocked: true, ...status };
    }
    await sql`
        INSERT INTO usage_events (user_id, ip, cookie_id, fingerprint, kind, tool, meta)
        VALUES (${status.userId}, ${status.ip}, ${status.cookieId}, ${status.fingerprint},
                ${kind || 'tool'}, ${tool || ''}, ${meta ? JSON.stringify(meta) : null})`;
    const remaining = status.unlimited ? null : Math.max(0, status.remaining - 1);
    return { blocked: false, ...status, used: status.used + 1, remaining };
}
