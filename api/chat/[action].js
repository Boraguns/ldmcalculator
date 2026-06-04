// Public live-chat endpoint (polling based). One serverless function.
//   POST /api/chat/send  { body, name?, email?, conversationId?, newSession?, lang? }
//   GET  /api/chat/poll?after=<id>&seen=<0|1>&id=<conv?>   → fetch new messages
//   GET  /api/chat/list                                    → visitor's conversations
//   POST /api/chat/close { conversationId }                → visitor closes a chat
//
// The visitor is identified by the signed anon-device cookie (ldm_aid), hashed
// into visitor_key, plus the logged-in user id when available. A visitor may
// have several conversations ("sessions"); the most recent open one is active.
import { sql, json, readJsonBody, clientIp } from '../_lib/db.js';
import { getOrSetAnonId, hashId, requireUser } from '../_lib/userauth.js';
import { ensureChatTables, preview, clampBody } from '../_lib/chat.js';

// A visitor owns conversations started on their device, plus — when logged in —
// any conversation linked to their account (so history follows them across
// devices/sessions).
function ownClause(visitorKey, user) {
    return user?.id
        ? sql`(visitor_key = ${visitorKey} OR user_id = ${user.id})`
        : sql`visitor_key = ${visitorKey}`;
}

// The visitor's most recent OPEN conversation (the one the composer targets).
async function findActive(visitorKey, user) {
    const own = ownClause(visitorKey, user);
    const rows = await sql`
        SELECT * FROM chat_conversations
        WHERE ${own} AND status = 'open'
        ORDER BY last_message_at DESC LIMIT 1`;
    return rows[0] || null;
}

// Load one conversation the visitor owns (open or closed).
async function findOwned(id, visitorKey, user) {
    const own = ownClause(visitorKey, user);
    const rows = await sql`
        SELECT * FROM chat_conversations WHERE id = ${id} AND ${own} LIMIT 1`;
    return rows[0] || null;
}

async function handleSend(req, res, { visitorKey, user }) {
    const b = await readJsonBody(req);
    const body = clampBody(b?.body);
    if (!body) return json(res, 400, { error: 'empty' });

    const name = (b?.name || '').toString().slice(0, 120).trim();
    const email = (b?.email || '').toString().slice(0, 200).trim();
    const lang = (b?.lang || '').toString().slice(0, 8).trim();
    const newSession = b?.newSession === true || b?.newSession === 'true';
    const wantId = parseInt(b?.conversationId, 10) || 0;
    const ip = clientIp(req);
    const ua = (req.headers['user-agent'] || '').slice(0, 500);

    const fullName = name || (user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : '');
    const mail = email || user?.email || '';

    // Decide which conversation receives the message.
    let conv = null;
    if (!newSession) {
        if (wantId) {
            const owned = await findOwned(wantId, visitorKey, user);
            // Only append to a still-open conversation; closed = read-only history.
            if (owned && owned.status === 'open') conv = owned;
        } else {
            conv = await findActive(visitorKey, user);
        }
    }

    if (!conv) {
        const rows = await sql`
            INSERT INTO chat_conversations
                (visitor_key, user_id, visitor_name, visitor_email, status, lang,
                 admin_unread, visitor_unread, last_message, last_sender, ip, user_agent)
            VALUES (${visitorKey}, ${user?.id || null}, ${fullName}, ${mail}, 'open', ${lang},
                    1, 0, ${preview(body)}, 'visitor', ${ip}, ${ua})
            RETURNING *`;
        conv = rows[0];
    } else {
        // Bump admin unread, refresh meta + fill any blanks we now know about.
        await sql`
            UPDATE chat_conversations SET
                status        = 'open',
                admin_unread  = admin_unread + 1,
                last_message  = ${preview(body)},
                last_sender   = 'visitor',
                last_message_at = NOW(),
                visitor_name  = CASE WHEN visitor_name = '' THEN ${fullName} ELSE visitor_name END,
                visitor_email = CASE WHEN visitor_email = '' THEN ${mail} ELSE visitor_email END,
                lang          = CASE WHEN lang = '' THEN ${lang} ELSE lang END,
                user_id       = COALESCE(user_id, ${user?.id || null})
            WHERE id = ${conv.id}`;
    }

    const msg = await sql`
        INSERT INTO chat_messages (conversation_id, sender, body)
        VALUES (${conv.id}, 'visitor', ${body})
        RETURNING id, sender, body, created_at`;

    return json(res, 200, { ok: true, conversationId: conv.id, message: msg[0] });
}

async function handlePoll(req, res, { visitorKey, user }) {
    const id = parseInt(req.query?.id, 10) || 0;
    const conv = id
        ? await findOwned(id, visitorKey, user)
        : await findActive(visitorKey, user);
    if (!conv) return json(res, 200, { conversationId: null, status: null, messages: [], unread: 0 });

    const after = parseInt(req.query?.after, 10) || 0;
    const seen = String(req.query?.seen || '') === '1';

    const messages = await sql`
        SELECT id, sender, body, created_at FROM chat_messages
        WHERE conversation_id = ${conv.id} AND id > ${after}
        ORDER BY id ASC LIMIT 200`;

    // Visitor has the panel open → clear their unread counter.
    if (seen && conv.visitor_unread > 0) {
        await sql`UPDATE chat_conversations SET visitor_unread = 0 WHERE id = ${conv.id}`;
    }

    return json(res, 200, {
        conversationId: conv.id,
        status: conv.status,
        messages,
        unread: seen ? 0 : conv.visitor_unread,
    });
}

// Total unread across ALL the visitor's conversations (for the closed bubble badge).
async function visitorUnread(visitorKey, user) {
    const own = ownClause(visitorKey, user);
    const rows = await sql`
        SELECT COALESCE(SUM(visitor_unread), 0)::int AS unread
        FROM chat_conversations WHERE ${own}`;
    return rows[0]?.unread || 0;
}

async function handleList(req, res, { visitorKey, user }) {
    const own = ownClause(visitorKey, user);
    const rows = await sql`
        SELECT id, status, last_message, last_sender, last_message_at,
               visitor_unread, created_at
        FROM chat_conversations
        WHERE ${own}
        ORDER BY last_message_at DESC LIMIT 50`;
    const unread = await visitorUnread(visitorKey, user);
    return json(res, 200, { conversations: rows, unread });
}

async function handleClose(req, res, { visitorKey, user }) {
    const b = await readJsonBody(req);
    const id = parseInt(b?.conversationId, 10) || 0;
    if (!id) return json(res, 400, { error: 'id required' });
    const own = ownClause(visitorKey, user);
    await sql`UPDATE chat_conversations SET status = 'closed' WHERE id = ${id} AND ${own}`;
    return json(res, 200, { ok: true });
}

export default async function handler(req, res) {
    const action = (req.query?.action || '').toString();
    try {
        await ensureChatTables();
        const anonId = getOrSetAnonId(req, res);
        const visitorKey = hashId(anonId);
        const user = await requireUser(req).catch(() => null);
        const ctx = { visitorKey, user };

        if (action === 'send' && req.method === 'POST') return handleSend(req, res, ctx);
        if (action === 'poll' && req.method === 'GET') return handlePoll(req, res, ctx);
        if (action === 'list' && req.method === 'GET') return handleList(req, res, ctx);
        if (action === 'close' && req.method === 'POST') return handleClose(req, res, ctx);
        return json(res, 404, { error: 'not found' });
    } catch (e) {
        console.error('chat', action, e);
        return json(res, 500, { error: 'server error' });
    }
}
