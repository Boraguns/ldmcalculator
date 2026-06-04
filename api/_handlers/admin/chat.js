// Admin side of the live chat.
//   GET    /api/admin/chat?status=open|closed|all      → conversation list
//   GET    /api/admin/chat?id=<conv>&after=<id>        → thread (marks admin read)
//   POST   /api/admin/chat { conversationId, body }    → admin reply
//   POST   /api/admin/chat { conversationId, action }  → close | reopen | read
//   GET    /api/admin/chat?blocks=1                    → list IP/email blocks
//   POST   /api/admin/chat { action:'block', type, value, reason } → add block
//   POST   /api/admin/chat { action:'unblock', id }    → remove a block
//   DELETE /api/admin/chat?id=<conv>                   → delete conversation + logs
import { sql, json, requireAdmin, readJsonBody } from '../../_lib/db.js';
import { ensureChatTables, preview, clampBody } from '../../_lib/chat.js';

async function listConversations(req, res) {
    const status = (req.query?.status || 'all').toString();
    let rows;
    if (status === 'open') {
        rows = await sql`SELECT * FROM chat_conversations WHERE status = 'open' ORDER BY last_message_at DESC LIMIT 300`;
    } else if (status === 'closed') {
        rows = await sql`SELECT * FROM chat_conversations WHERE status = 'closed' ORDER BY last_message_at DESC LIMIT 300`;
    } else {
        rows = await sql`SELECT * FROM chat_conversations ORDER BY last_message_at DESC LIMIT 300`;
    }
    const totals = await sql`
        SELECT
            COALESCE(SUM(admin_unread), 0)::int AS unread,
            COUNT(*) FILTER (WHERE status = 'open' AND admin_unread > 0)::int AS active
        FROM chat_conversations`;
    return json(res, 200, { items: rows, unread: totals[0]?.unread || 0, active: totals[0]?.active || 0 });
}

async function thread(req, res, id) {
    const after = parseInt(req.query?.after, 10) || 0;
    const conv = await sql`SELECT * FROM chat_conversations WHERE id = ${id} LIMIT 1`;
    if (!conv[0]) return json(res, 404, { error: 'not found' });
    const messages = await sql`
        SELECT id, sender, body, created_at FROM chat_messages
        WHERE conversation_id = ${id} AND id > ${after}
        ORDER BY id ASC LIMIT 500`;
    // Admin is viewing → clear the admin unread counter.
    if (conv[0].admin_unread > 0) {
        await sql`UPDATE chat_conversations SET admin_unread = 0 WHERE id = ${id}`;
    }
    return json(res, 200, { conversation: { ...conv[0], admin_unread: 0 }, messages });
}

async function reply(req, res, conversationId, body) {
    const text = clampBody(body);
    if (!text) return json(res, 400, { error: 'empty' });
    const conv = await sql`SELECT id FROM chat_conversations WHERE id = ${conversationId} LIMIT 1`;
    if (!conv[0]) return json(res, 404, { error: 'not found' });
    const msg = await sql`
        INSERT INTO chat_messages (conversation_id, sender, body)
        VALUES (${conversationId}, 'admin', ${text})
        RETURNING id, sender, body, created_at`;
    await sql`
        UPDATE chat_conversations SET
            status = 'open',
            visitor_unread = visitor_unread + 1,
            last_message = ${preview(text)},
            last_sender = 'admin',
            last_message_at = NOW()
        WHERE id = ${conversationId}`;
    return json(res, 200, { ok: true, message: msg[0] });
}

async function listBlocks(req, res) {
    const rows = await sql`SELECT id, type, value, reason, created_at FROM chat_blocks ORDER BY created_at DESC LIMIT 500`;
    return json(res, 200, { blocks: rows });
}

async function addBlock(req, res, b) {
    const type = (b?.type || '').toString();
    if (type !== 'ip' && type !== 'email') return json(res, 400, { error: 'bad type' });
    const value = type === 'email'
        ? (b?.value || '').toString().toLowerCase().trim()
        : (b?.value || '').toString().trim();
    if (!value) return json(res, 400, { error: 'value required' });
    const reason = (b?.reason || '').toString().slice(0, 300);
    await sql`
        INSERT INTO chat_blocks (type, value, reason)
        VALUES (${type}, ${value}, ${reason})
        ON CONFLICT (type, value) DO UPDATE SET reason = EXCLUDED.reason`;
    // Close any open conversations from that source so the ban takes effect now.
    if (type === 'ip') await sql`UPDATE chat_conversations SET status = 'closed' WHERE ip = ${value}`;
    else await sql`UPDATE chat_conversations SET status = 'closed' WHERE LOWER(visitor_email) = ${value}`;
    return json(res, 200, { ok: true });
}

async function removeBlock(req, res, b) {
    const id = parseInt(b?.id, 10) || 0;
    if (id) { await sql`DELETE FROM chat_blocks WHERE id = ${id}`; return json(res, 200, { ok: true }); }
    const type = (b?.type || '').toString();
    const value = (b?.value || '').toString().trim();
    if (type && value) { await sql`DELETE FROM chat_blocks WHERE type = ${type} AND value = ${value}`; return json(res, 200, { ok: true }); }
    return json(res, 400, { error: 'id required' });
}

export default async function handler(req, res) {
    if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
    try {
        await ensureChatTables();

        if (req.method === 'GET') {
            if (req.query?.blocks) return listBlocks(req, res);
            const id = parseInt(req.query?.id, 10) || 0;
            return id ? thread(req, res, id) : listConversations(req, res);
        }

        if (req.method === 'POST') {
            const b = await readJsonBody(req);
            const action = (b?.action || '').toString();
            if (action === 'block') return addBlock(req, res, b);
            if (action === 'unblock') return removeBlock(req, res, b);
            const conversationId = parseInt(b?.conversationId, 10) || 0;
            if (!conversationId) return json(res, 400, { error: 'conversationId required' });
            if (action === 'close') {
                await sql`UPDATE chat_conversations SET status = 'closed' WHERE id = ${conversationId}`;
                return json(res, 200, { ok: true });
            }
            if (action === 'reopen') {
                await sql`UPDATE chat_conversations SET status = 'open' WHERE id = ${conversationId}`;
                return json(res, 200, { ok: true });
            }
            if (action === 'read') {
                await sql`UPDATE chat_conversations SET admin_unread = 0 WHERE id = ${conversationId}`;
                return json(res, 200, { ok: true });
            }
            return reply(req, res, conversationId, b?.body);
        }

        if (req.method === 'DELETE') {
            const id = parseInt(req.query?.id, 10) || 0;
            if (!id) return json(res, 400, { error: 'id required' });
            await sql`DELETE FROM chat_conversations WHERE id = ${id}`;
            return json(res, 200, { ok: true });
        }

        return json(res, 405, { error: 'method not allowed' });
    } catch (e) {
        console.error('admin/chat', e);
        return json(res, 500, { error: 'server error' });
    }
}
