// End-user authentication context. Mirrors the server's ldm_token cookie with
// a localStorage copy so the SPA can read auth state synchronously and attach a
// Bearer header. Kept entirely separate from the admin auth in Admin.jsx.
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, getToken } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        if (!getToken()) { setUser(null); setSubscription(null); setLoading(false); return null; }
        try {
            const j = await api('/api/auth/me');
            setUser(j.user || null);
            setSubscription(j.subscription || null);
            return j.user || null;
        } catch (e) {
            if (e.status === 401) { setToken(''); setUser(null); setSubscription(null); }
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const login = useCallback(async (email, password) => {
        const j = await api('/api/auth/login', { method: 'POST', auth: false, body: { email, password } });
        setToken(j.token);
        setUser(j.user || null);
        await refresh();
        return j;
    }, [refresh]);

    const register = useCallback(async (payload) => {
        const j = await api('/api/auth/register', { method: 'POST', auth: false, body: payload });
        setToken(j.token);
        setUser(j.user || null);
        return j;
    }, []);

    const logout = useCallback(async () => {
        try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* noop */ }
        setToken('');
        setUser(null);
        setSubscription(null);
    }, []);

    const isPaid = !!subscription && ['active', 'past_due'].includes(subscription.status);

    return (
        <AuthContext.Provider value={{ user, subscription, isPaid, loading, login, register, logout, refresh, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
