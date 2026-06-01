import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthShell, { ErrorMsg, OkMsg, SubmitBtn } from '../components/AuthShell';
import { api } from '../utils/api';
import { useT } from '../i18n/LanguageContext';
import usePageMeta from '../hooks/usePageMeta';

export default function VerifyEmail() {
    const { t } = useT();
    const [params] = useSearchParams();
    const token = params.get('token') || '';
    usePageMeta({ title: 'Verify email | LDMCalculator', description: 'Verify your email address.' });

    const [state, setState] = useState(token ? 'loading' : 'notoken'); // loading | ok | error | notoken

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        (async () => {
            try {
                await api('/api/auth/verify-email', { method: 'POST', auth: false, body: { token } });
                if (!cancelled) setState('ok');
            } catch {
                if (!cancelled) setState('error');
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    return (
        <AuthShell title={t('auth.verifyTitle')}>
            {state === 'loading' && <p style={{ color: '#94a3b8', textAlign: 'center' }}>{t('auth.verifyLoading')}</p>}
            {state === 'ok' && (
                <>
                    <OkMsg>{t('auth.verifyOk')}</OkMsg>
                    <Link to="/account"><SubmitBtn>{t('auth.goToAccount')}</SubmitBtn></Link>
                </>
            )}
            {state === 'error' && (
                <>
                    <ErrorMsg>{t('auth.verifyError')}</ErrorMsg>
                    <Link to="/account"><SubmitBtn>{t('auth.goToAccount')}</SubmitBtn></Link>
                </>
            )}
            {state === 'notoken' && <ErrorMsg>{t('auth.verifyNoToken')}</ErrorMsg>}
        </AuthShell>
    );
}
