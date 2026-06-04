import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../utils/api';
import { linkify } from '../utils/linkify';
import { useT } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';

/**
 * Floating live-chat widget (bottom-right). Polling based — no websockets — so
 * it fits the Vercel serverless + Neon stack with zero extra infrastructure.
 *
 *  - Closed: a round bubble with an unread badge. Polls slowly (15s) just to
 *            keep the badge fresh.
 *  - Open:   either the active thread (composer) or the history list.
 *
 * Visitors are identified server-side by the signed anon-device cookie; logged
 * in users also carry their account id so history follows them. A visitor may
 * keep several conversations ("sessions"); an idle conversation auto-closes and
 * a fresh one can be started.
 */
const POLL_OPEN = 3000;
const POLL_CLOSED = 15000;
const IDLE_WARN = 180000; // 3 min of silence → show the closing warning
const IDLE_GRACE = 30000;  // …then 30s before the conversation auto-closes

const ChatWidget = () => {
    const { t, lang } = useT();
    const { user } = useAuth();
    const location = useLocation();

    const [open, setOpen] = useState(false);
    const [view, setView] = useState('chat');        // 'chat' | 'list'
    const [convId, setConvId] = useState(null);
    const [convStatus, setConvStatus] = useState(null);
    const [messages, setMessages] = useState([]);
    const [history, setHistory] = useState([]);
    const [input, setInput] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [unread, setUnread] = useState(0);
    const [sending, setSending] = useState(false);
    const [idleLeft, setIdleLeft] = useState(null);  // seconds left before auto-close, or null

    const lastId = useRef(0);
    const timer = useRef(null);
    const scrollRef = useRef(null);
    const forceNew = useRef(false);                   // next send must start a fresh session
    const lastActivity = useRef(Date.now());

    // Refs kept in sync each render so the polling callback never goes stale.
    const openRef = useRef(open); openRef.current = open;
    const viewRef = useRef(view); viewRef.current = view;
    const convIdRef = useRef(convId); convIdRef.current = convId;

    const started = convId !== null || messages.length > 0;
    const showLead = !user && !started;               // ask name/email only for fresh anon chats

    // Prefill (and lock) the contact fields for logged-in users.
    useEffect(() => {
        if (user) {
            setName([user.firstName, user.lastName].filter(Boolean).join(' ').trim());
            setEmail(user.email || '');
        }
    }, [user]);

    const merge = useCallback((incoming) => {
        if (!incoming || !incoming.length) return;
        setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const fresh = incoming.filter((m) => !seen.has(m.id));
            if (!fresh.length) return prev;
            const next = [...prev, ...fresh];
            lastId.current = next.reduce((a, m) => Math.max(a, m.id), 0);
            return next;
        });
    }, []);

    const poll = useCallback(async () => {
        try {
            // Closed bubble — just keep the unread badge fresh.
            if (!openRef.current) {
                const j = await api('/api/chat/list', { auth: true });
                setUnread(j.unread || 0);
                return;
            }
            // History list view.
            if (viewRef.current === 'list') {
                const j = await api('/api/chat/list', { auth: true });
                setHistory(j.conversations || []);
                setUnread(0);
                return;
            }
            // Active thread view. A brand-new session has nothing to fetch yet.
            if (forceNew.current && !convIdRef.current) return;
            const id = convIdRef.current;
            const qs = `after=${lastId.current}&seen=1${id ? `&id=${id}` : ''}`;
            const j = await api(`/api/chat/poll?${qs}`, { auth: true });
            if (j.conversationId && !convIdRef.current) {
                convIdRef.current = j.conversationId;
                setConvId(j.conversationId);
            }
            if (j.status) setConvStatus(j.status);
            const incoming = j.messages || [];
            // A new admin reply counts as activity → reset the idle timer.
            if (incoming.some((m) => m.id > lastId.current && m.sender === 'admin')) {
                lastActivity.current = Date.now();
            }
            merge(incoming);
            setUnread(0);
        } catch { /* network blip — try again next tick */ }
    }, [merge]);

    // (Re)arm the polling interval whenever open/view flips.
    useEffect(() => {
        poll();
        if (timer.current) clearInterval(timer.current);
        timer.current = setInterval(poll, open ? POLL_OPEN : POLL_CLOSED);
        return () => { if (timer.current) clearInterval(timer.current); };
    }, [open, view, poll]);

    // Idle watchdog: warn after 3 min of silence, auto-close 30s later.
    useEffect(() => {
        if (!(open && view === 'chat' && convStatus === 'open' && convId)) {
            setIdleLeft(null);
            return;
        }
        const tick = setInterval(() => {
            const elapsed = Date.now() - lastActivity.current;
            if (elapsed < IDLE_WARN) { setIdleLeft(null); return; }
            const left = Math.ceil((IDLE_WARN + IDLE_GRACE - elapsed) / 1000);
            if (left <= 0) { setIdleLeft(null); autoClose(); }
            else setIdleLeft(left);
        }, 1000);
        return () => clearInterval(tick);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, view, convStatus, convId]);

    // Keep the thread pinned to the newest message.
    useEffect(() => {
        if (open && view === 'chat' && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, open, view]);

    const autoClose = async () => {
        const id = convIdRef.current;
        if (!id) return;
        try { await api('/api/chat/close', { method: 'POST', auth: true, body: { conversationId: id } }); }
        catch { /* ignore */ }
        setConvStatus('closed');
    };

    const stayOpen = () => { lastActivity.current = Date.now(); setIdleLeft(null); };

    const startNew = () => {
        forceNew.current = true;
        lastActivity.current = Date.now();
        lastId.current = 0;
        convIdRef.current = null;
        setConvId(null);
        setConvStatus(null);
        setMessages([]);
        setIdleLeft(null);
        viewRef.current = 'chat';
        setView('chat');
    };

    const showHistory = () => { viewRef.current = 'list'; setView('list'); };

    const openConversation = (c) => {
        forceNew.current = false;
        lastActivity.current = Date.now();
        lastId.current = 0;
        convIdRef.current = c.id;
        setConvId(c.id);
        setConvStatus(c.status);
        setMessages([]);
        setIdleLeft(null);
        viewRef.current = 'chat';
        setView('chat');
        poll();
    };

    const send = async () => {
        const body = input.trim();
        if (!body || sending) return;
        setSending(true);
        lastActivity.current = Date.now();
        setIdleLeft(null);
        // Optimistic echo so the visitor sees their message instantly.
        const optimistic = { id: -Date.now(), sender: 'visitor', body, created_at: new Date().toISOString() };
        setMessages((prev) => [...prev, optimistic]);
        setInput('');
        try {
            const j = await api('/api/chat/send', {
                method: 'POST',
                auth: true,
                body: {
                    body,
                    name: name.trim(),
                    email: email.trim(),
                    lang,
                    conversationId: convIdRef.current || undefined,
                    newSession: forceNew.current || undefined,
                },
            });
            forceNew.current = false;
            if (j.conversationId) { convIdRef.current = j.conversationId; setConvId(j.conversationId); }
            setConvStatus('open');
            // Replace the optimistic row with the server copy.
            setMessages((prev) => {
                const without = prev.filter((m) => m.id !== optimistic.id);
                const real = j.message;
                const next = real ? [...without, real] : without;
                lastId.current = next.reduce((a, m) => Math.max(a, m.id), lastId.current);
                return next;
            });
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
    const fmtDate = (iso) => {
        try { return new Date(iso).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
        catch { return ''; }
    };

    // Never show on the admin console.
    if (location.pathname.startsWith('/admin')) return null;

    const isClosed = convStatus === 'closed';

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
                        {view === 'list' ? (
                            <button onClick={() => { viewRef.current = 'chat'; setView('chat'); }} aria-label={t('chat.back')} style={iconBtn}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                            </button>
                        ) : (
                            <span style={{
                                width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.18)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                            }}>
                                <img src="/chat.png" alt="" aria-hidden="true" style={{ width: 24, height: 24, objectFit: 'contain', display: 'block' }} />
                            </span>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                {view === 'list' ? t('chat.history') : t('chat.title')}
                            </div>
                            <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>{t('chat.subtitle')}</div>
                        </div>
                        {view === 'chat' && (
                            <button onClick={showHistory} aria-label={t('chat.history')} style={iconBtn}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                            </button>
                        )}
                        <button
                            onClick={() => setOpen(false)}
                            aria-label={t('chat.close')}
                            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.4rem', lineHeight: 1, cursor: 'pointer', padding: 4 }}
                        >×</button>
                    </div>

                    {/* History list */}
                    {view === 'list' && (
                        <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <button onClick={startNew} style={{
                                border: '1px dashed rgba(255,255,255,0.3)', background: 'transparent', color: '#93c5fd',
                                borderRadius: 10, padding: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                            }}>+ {t('chat.newChat')}</button>
                            {history.length === 0 && (
                                <div style={{ color: '#94a3b8', fontSize: '0.82rem', textAlign: 'center', marginTop: 16 }}>{t('chat.noHistory')}</div>
                            )}
                            {history.map((c) => (
                                <button key={c.id} onClick={() => openConversation(c)} style={{
                                    textAlign: 'left', background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 10, padding: '9px 11px', cursor: 'pointer', color: '#e2e8f0', position: 'relative',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                        <span style={{
                                            fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                                            background: c.status === 'open' ? 'rgba(34,197,94,0.18)' : 'rgba(148,163,184,0.18)',
                                            color: c.status === 'open' ? '#4ade80' : '#cbd5e1',
                                        }}>{c.status === 'open' ? t('chat.statusOpen') : t('chat.statusClosed')}</span>
                                        <span style={{ fontSize: '0.66rem', opacity: 0.6 }}>{fmtDate(c.last_message_at)}</span>
                                    </div>
                                    <div style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {c.last_sender === 'admin' ? '↩ ' : ''}{c.last_message || '…'}
                                    </div>
                                    {c.visitor_unread > 0 && (
                                        <span style={{
                                            position: 'absolute', top: 8, right: 8, minWidth: 8, height: 8,
                                            borderRadius: 999, background: '#ef4444',
                                        }} />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Messages */}
                    {view === 'chat' && (
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
                                    {linkify(m.body, { color: m.sender === 'visitor' ? '#dbeafe' : '#93c5fd', textDecoration: 'underline' })}
                                    <div style={{ fontSize: '0.62rem', opacity: 0.6, marginTop: 3, textAlign: 'right' }}>{fmtTime(m.created_at)}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Footer: idle warning + composer, or the closed notice */}
                    {view === 'chat' && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', background: '#0b1220' }}>
                            {idleLeft !== null && !isClosed && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                                    background: 'rgba(234,179,8,0.12)', color: '#fde68a', fontSize: '0.76rem',
                                }}>
                                    <span style={{ flex: 1 }}>{t('chat.idleWarning', { sec: idleLeft })}</span>
                                    <button onClick={stayOpen} style={{
                                        flexShrink: 0, border: 'none', borderRadius: 7, padding: '5px 9px', cursor: 'pointer',
                                        background: '#2563eb', color: '#fff', fontSize: '0.72rem', fontWeight: 600,
                                    }}>{t('chat.stayOpen')}</button>
                                </div>
                            )}

                            {isClosed ? (
                                <div style={{ padding: 12, textAlign: 'center' }}>
                                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 8 }}>{t('chat.closedNotice')}</div>
                                    <button onClick={startNew} style={{
                                        border: 'none', borderRadius: 9, padding: '9px 14px', cursor: 'pointer',
                                        background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', fontSize: '0.84rem', fontWeight: 600,
                                    }}>{t('chat.startNew')}</button>
                                </div>
                            ) : (
                                <div style={{ padding: 10 }}>
                                    {showLead && (
                                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                                            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`${t('chat.name')} (${t('chat.optional')})`} style={inS} />
                                            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`${t('chat.email')} (${t('chat.optional')})`} style={inS} />
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
                            )}
                        </div>
                    )}
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

const iconBtn = {
    background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer',
    width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
};

export default ChatWidget;
