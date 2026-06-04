// Public live-chat endpoint (polling based). One serverless function.
//   POST /api/chat/send  { body, name?, email? }   → visitor sends a message
//   GET  /api/chat/poll?after=<id>&seen=<0|1>      → fetch new messages
//
// The visitor is identified by the signed anon-device cookie (ldm_aid), hashed
// into visitor_key, plus the logged-in user id when available. One open
// conversation per visitor; a closed conversation is reopened on a new message.
import { sql, json, readJsonBody, clientIp } from '../_lib/db.js';
import { getOrSetAnonId, hashId, requireUser } from '../_lib/userauth.js';
import { ensureChatTables, preview, clampBody } from '../_lib/chat.js';

// Find the visitor's most recent conversation (open or closed) by device key.
async function findConversation(visitorKey) {
    const rows = await sql`
        SELECT * FROM chat_conversations
        WHERE visitor_key = ${visitorKey}
        ORDER BY last_message_at DESC LIMIT 1`;
    return rows[0] || null;
}

async function handleSend(req, res, { visitorKey, user }) {
    const b = await readJsonBody(req);
    const body = clampBody(b?.body);
    if (!body) return json(res, 400, { error: 'empty' });

    const name = (b?.name || '').toString().slice(0, 120).trim();
    const email = (b?.email || '').toString().slice(0, 200).trim();
    const ip = clientIp(req);
    const ua = (req.headers['user-agent'] || '').slice(0, 500);

    let conv = await findConversation(visitorKey);
    if (!conv) {
        const rows = await sql`
            INSERT INTO chat_conversations
                (visitor_key, user_id, visitor_name, visitor_email, status,
                 admin_unread, visitor_unread, last_message, last_sender, ip, user_agent)
            VALUES (${visitorKey}, ${user?.id || null},
                    ${name || (user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : '')},
                    ${email || user?.email || ''}, 'open',
                    1, 0, ${preview(body)}, 'visitor', ${ip}, ${ua})
            RETURNING *`;
        conv = rows[0];
    } else {
        // Reopen if closed, bump admin unread, refresh meta + any newly supplied
        // name/email (only fill blanks so we don't clobber existing values).
        await sql`
            UPDATE chat_conversations SET
                status        = 'open',
                admin_unread  = admin_unread + 1,
                last_message  = ${preview(body)},
                last_sender   = 'visitor',
                last_message_at = NOW(),
                visitor_name  = CASE WHEN visitor_name = '' THEN ${name} ELSE visitor_name END,
                visitor_email = CASE WHEN visitor_email = '' THEN ${email} ELSE visitor_email END,
                user_id       = COALESCE(user_id, ${user?.id || null})
            WHERE id = ${conv.id}`;
    }

    const msg = await sql`
        INSERT INTO chat_messages (conversation_id, sender, body)
        VALUES (${conv.id}, 'visitor', ${body})
        RETURNING id, sender, body, created_at`;

    return json(res, 200, { ok: true, conversationId: conv.id, message: msg[0] });
}

async function handlePoll(req, res, { visitorKey }) {
    const conv = await findConversation(visitorKey);
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

export default async function handler(req, res) {
    const action = (req.query?.action || '').toString();
    try {
        await ensureChatTables();
        const anonId = getOrSetAnonId(req, res);
        const visitorKey = hashId(anonId);
        const user = await requireUser(req).catch(() => null);

        if (action === 'send' && req.method === 'POST') {
            return handleSend(req, res, { visitorKey, user });
        }
        if (action === 'poll' && req.method === 'GET') {
            return handlePoll(req, res, { visitorKey });
        }
        return json(res, 404, { error: 'not found' });
    } catch (e) {
        console.error('chat', action, e);
        return json(res, 500, { error: 'server error' });
    }
}
