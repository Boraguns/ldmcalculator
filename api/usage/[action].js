// Free-tier usage metering endpoint — routed by /api/usage/<action>.
//   check   · GET-ish, returns the caller's current daily quota status
//   consume · records one service use (stacking run or tool document) if allowed
//
// Identity for anonymous visitors is the union of (hashed IP, signed cookie,
// hashed fingerprint) so clearing one signal alone doesn't reset the quota.
import { json, readJsonBody } from '../_lib/db.js';
import { requireUser } from '../_lib/userauth.js';
import { getUsageStatus, consumeUsage } from '../_lib/usage.js';

const fpFrom = (req, b) =>
    (b?.fingerprint || req.query?.fp || req.headers['x-fingerprint'] || '').toString().slice(0, 200);

// Strip internal-only fields before returning to the client.
const publicStatus = (s) => ({
    tier: s.tier, unlimited: s.unlimited, limit: s.limit,
    used: s.used, remaining: s.remaining,
});

async function check(req, res) {
    const b = req.method === 'POST' ? await readJsonBody(req).catch(() => ({})) : {};
    const user = await requireUser(req);
    const status = await getUsageStatus(req, res, user, fpFrom(req, b));
    return json(res, 200, publicStatus(status));
}

async function consume(req, res) {
    const b = await readJsonBody(req).catch(() => ({}));
    const user = await requireUser(req);
    const kind = b.kind === 'stacking' ? 'stacking' : 'tool';
    const tool = String(b.tool || '').slice(0, 40);
    const result = await consumeUsage(req, res, user, { kind, tool, fp: fpFrom(req, b), meta: b.meta || null });
    if (result.blocked) {
        return json(res, 402, { error: 'limit_reached', ...publicStatus(result) });
    }
    return json(res, 200, { ok: true, ...publicStatus(result) });
}

const ACTIONS = { check, consume };

export default async function handler(req, res) {
    const action = (req.query?.action || '').toString();
    const fn = ACTIONS[action];
    if (!fn) return json(res, 404, { error: 'not_found' });
    try {
        return await fn(req, res);
    } catch (e) {
        console.error('usage/' + action, e);
        return json(res, 500, { error: 'server_error' });
    }
}
