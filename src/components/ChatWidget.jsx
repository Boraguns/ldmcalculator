import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../utils/api';
import { useT } from '../i18n/LanguageContext';

/**
 * Floating live-chat widget (bottom-right). Polling based — no websockets — so
 * it fits the Vercel serverless + Neon stack with zero extra infrastructure.
 *
 *  - Closed: a round bubble with an unread badge. Polls slowly (15s) just to
 *            keep the badge fresh.
 *  - Open:   a panel with the message thread + composer. Polls every 3s and
 *            marks admin replies as read (seen=1).
 *
 * The visitor is identified server-side by the signed anon-device cookie, so the
 * client keeps no secret — it just tracks the last message id it has seen.
 */
const POLL_OPEN = 3000;
const POLL_CLOSED = 15000;

const ChatWidget = () => {
    const { t } = useT();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [unread, setUnread] = useState(0);
    const [status, setStatus] = useState(null);
    const [sending, setSending] = useState(false);

    const lastId = useRef(0);
    const timer = useRef(null);
    const scrollRef = useRef(null);
    const openRef = useRef(open);
    openRef.current = open;

    const started = messages.length > 0;

    const merge = useCallback((incoming) => {
        if (!incoming || !incoming.length) return;
        setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const fresh = incoming.filter((m) => !seen.has(m.id));
            if (!fresh.length) return prev;
            const next = [...prev, ...fresh];
            const maxId = next.reduce((a, m) => Math.max(a, m.id), 0);
            lastId.current = maxId;
            return next;
        });
    }, []);

    const poll = useCallback(async () => {
        try {
            const seen = openRef.current ? 1 : 0;
            const j = await api(`/api/chat/poll?after=${lastId.current}&seen=${seen}`, { auth: true });
            merge(j.messages);
            if (j.status) setStatus(j.status);
            setUnread(openRef.current ? 0 : (j.unread || 0));
        } catch { /* network blip — try again next tick */ }
    }, [merge]);

    // (Re)arm the polling interval whenever the open state flips.
    useEffect(() => {
        poll();
        if (timer.current) clearInterval(timer.current);
        timer.current = setInterval(poll, open ? POLL_OPEN : POLL_CLOSED);
        return () => { if (timer.current) clearInterval(timer.current); };
    }, [open, poll]);

    // Keep the thread pinned to the newest message.
    useEffect(() => {
        if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, open]);

    const send = async () => {
        const body = input.trim();
        if (!body || sending) return;
        setSending(true);
        // Optimistic echo so the visitor sees their message instantly.
        const optimistic = { id: -Date.now(), sender: 'visitor', body, created_at: new Date().toISOString() };
        setMessages((prev) => [...prev, optimistic]);
        setInput('');
        try {
            const j = await api('/api/chat/send', {
                method: 'POST',
                auth: true,
                body: { body, name: name.trim(), email: email.trim() },
            });
            // Replace the optimistic row with the server copy.
            setMessages((prev) => {
                const without = prev.filter((m) => m.id !== optimistic.id);
                const real = j.message;
                const next = real ? [...without, real] : without;
                lastId.current = next.reduce((a, m) => Math.max(a, m.id), lastId.current);
                return next;
            });
            setStatus('open');
        } catch {
            // Roll back the optimistic message on failure.
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            setInput(body);
        } finally {
            setSending(false);
        }
    };

    const onKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    const fmtTime = (iso) => {
        try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
        catch { return ''; }
    };

    // Never show on the admin console.
    if (location.pathname.startsWith('/admin')) return null;

    return (
        <div style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 4000, fontFamily: 'inherit' }}>
            {open && (
                <div style={{
                    width: 'min(360px, calc(100vw - 36px))',
                    height: 'min(520px, calc(100vh - 120px))',
                    display: 'flex', flexDirection: 'column',
                    background: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 16,
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                    marginBottom: 12,
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                        background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff',
                    }}>
                        <span style={{
                            width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.18)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                        }}>
                            <img src="/chat.png" alt="" aria-hidden="true" style={{ width: 24, height: 24, objectFit: 'contain', display: 'block' }} />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t('chat.title')}</div>
                            <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>{t('chat.subtitle')}</div>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            aria-label={t('chat.close')}
                            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.4rem', lineHeight: 1, cursor: 'pointer', padding: 4 }}
                        >×</button>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{
                            alignSelf: 'flex-start', maxWidth: '85%', background: '#1e293b', color: '#cbd5e1',
                            padding: '8px 11px', borderRadius: '12px 12px 12px 4px', fontSize: '0.85rem', lineHeight: 1.45,
                        }}>{t('chat.greeting')}</div>

                        {messages.map((m) => (
                            <div key={m.id} style={{
                                alignSelf: m.sender === 'visitor' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                background: m.sender === 'visitor' ? '#2563eb' : '#1e293b',
                                color: m.sender === 'visitor' ? '#fff' : '#e2e8f0',
                                padding: '8px 11px',
                                borderRadius: m.sender === 'visitor' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                                fontSize: '0.85rem', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            }}>
                                {m.body}
                                <div style={{ fontSize: '0.62rem', opacity: 0.6, marginTop: 3, textAlign: 'right' }}>{fmtTime(m.created_at)}</div>
                            </div>
                        ))}
                    </div>

                    {/* Composer */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: 10, background: '#0b1220' }}>
                        {!started && (
                            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                                <input
                                    value={name} onChange={(e) => setName(e.target.value)}
                                    placeholder={`${t('chat.name')} (${t('chat.optional')})`}
                                    style={inS}
                                />
                                <input
                                    value={email} onChange={(e) => setEmail(e.target.value)}
                                    placeholder={`${t('chat.email')} (${t('chat.optional')})`}
                                    style={inS}
                                />
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={onKeyDown}
                                placeholder={t('chat.placeholder')}
                                rows={1}
                                style={{ ...inS, flex: 1, resize: 'none', maxHeight: 90, lineHeight: 1.4 }}
                            />
                            <button
                                onClick={send}
                                disabled={sending || !input.trim()}
                                style={{
                                    flexShrink: 0, width: 40, height: 40, borderRadius: 10, border: 'none',
                                    background: input.trim() ? '#2563eb' : '#334155', color: '#fff',
                                    cursor: input.trim() ? 'pointer' : 'default', fontSize: '1.1rem',
                                }}
                                aria-label={t('chat.send')}
                            >➤</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bubble */}
            <button
                onClick={() => setOpen((o) => !o)}
                aria-label={t('chat.open')}
                style={{
                    position: 'relative', marginLeft: 'auto', display: 'flex',
                    width: 58, height: 58, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff',
                    alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem',
                    boxShadow: '0 10px 28px rgba(37,99,235,0.5)',
                }}
            >
                {open ? '×' : (
                    <img
                        src="/chat.png"
                        alt=""
                        aria-hidden="true"
                        style={{ width: 34, height: 34, objectFit: 'contain', display: 'block' }}
                    />
                )}
                {!open && unread > 0 && (
                    <span style={{
                        position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, padding: '0 5px',
                        borderRadius: 999, background: '#ef4444', color: '#fff', fontSize: '0.72rem', fontWeight: 800,
                        lineHeight: '20px', textAlign: 'center', border: '2px solid #0f172a',
                    }}>{unread}</span>
                )}
            </button>
        </div>
    );
};

const inS = {
    background: '#0f172a', border: '1px solid rgba(255,255,255,0.14)', color: '#f1f5f9',
    borderRadius: 8, padding: '9px 10px', fontSize: '0.85rem', fontFamily: 'inherit', width: '100%',
    boxSizing: 'border-box', outline: 'none',
};

export default ChatWidget;
