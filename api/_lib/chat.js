// Shared helpers for the polling-based live chat (visitor ⇄ admin).
// Both the public endpoint (api/chat/[action].js) and the admin handler
// (api/_handlers/admin/chat.js) import from here so the schema is provisioned
// once and the table shape stays in sync.
import { sql } from './db.js';

// Self-provision the chat tables so no manual migration is required. Guarded by
// a module-level flag so warm invocations skip the round-trip.
let ensured = false;
export async function ensureChatTables() {
    if (ensured) return;
    await sql`
        CREATE TABLE IF NOT EXISTS chat_conversations (
            id              SERIAL PRIMARY KEY,
            visitor_key     TEXT NOT NULL,
            user_id         INTEGER,
            visitor_name    TEXT DEFAULT '',
            visitor_email   TEXT DEFAULT '',
            status          TEXT DEFAULT 'open',
            admin_unread    INTEGER DEFAULT 0,
            visitor_unread  INTEGER DEFAULT 0,
            last_message    TEXT DEFAULT '',
            last_sender     TEXT DEFAULT '',
            last_message_at TIMESTAMPTZ DEFAULT NOW(),
            ip              TEXT DEFAULT '',
            user_agent      TEXT DEFAULT '',
            created_at      TIMESTAMPTZ DEFAULT NOW()
        )`;
    await sql`
        CREATE TABLE IF NOT EXISTS chat_messages (
            id              SERIAL PRIMARY KEY,
            conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
            sender          TEXT NOT NULL,
            body            TEXT NOT NULL,
            created_at      TIMESTAMPTZ DEFAULT NOW()
        )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_conv_visitor ON chat_conversations(visitor_key)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_conv_recent  ON chat_conversations(last_message_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON chat_messages(conversation_id, id)`;
    ensured = true;
}

// One short preview line for the conversation list.
export const preview = (body) => String(body || '').replace(/\s+/g, ' ').trim().slice(0, 120);

// Clamp a free-text message to a sane size.
export const clampBody = (body) => String(body || '').trim().slice(0, 4000);
