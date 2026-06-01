// Usage-gating context. Exposes `guard(kind, tool)` which records one service
// use against the server-side daily quota and resolves true when allowed. When
// the quota is exhausted it opens a single, app-wide Paywall modal and resolves
// false so the caller aborts the action.
import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../utils/api';
import Paywall from '../components/Paywall';

const UsageContext = createContext(null);

export function UsageProvider({ children }) {
    const [status, setStatus] = useState(null);     // last known quota status
    const [paywall, setPaywall] = useState(null);   // {tier,limit,used,...} when open

    const checkStatus = useCallback(async () => {
        try {
            const s = await api('/api/usage/check', { method: 'POST', body: {} });
            setStatus(s);
            return s;
        } catch { return null; }
    }, []);

    // Returns true if the action may proceed; false (and opens paywall) if not.
    const guard = useCallback(async (kind, tool) => {
        try {
            const r = await api('/api/usage/consume', { method: 'POST', body: { kind, tool } });
            setStatus(r);
            return true;
        } catch (e) {
            if (e.status === 402) {
                setStatus(e.data);
                setPaywall(e.data);
                return false;
            }
            // On unexpected errors, fail open so a metering outage never blocks
            // a paying or legitimate user from using the core product.
            console.error('usage guard', e);
            return true;
        }
    }, []);

    const closePaywall = useCallback(() => setPaywall(null), []);

    return (
        <UsageContext.Provider value={{ status, guard, checkStatus, openPaywall: setPaywall }}>
            {children}
            {paywall && <Paywall status={paywall} onClose={closePaywall} />}
        </UsageContext.Provider>
    );
}

export const useUsage = () => {
    const ctx = useContext(UsageContext);
    if (!ctx) throw new Error('useUsage must be used within UsageProvider');
    return ctx;
};
