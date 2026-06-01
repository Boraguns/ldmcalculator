import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import AuthShell, { Field, SubmitBtn, ErrorMsg, OkMsg } from '../components/AuthShell';
import { api } from '../utils/api';
import { useT } from '../i18n/LanguageContext';
import usePageMeta from '../hooks/usePageMeta';

// One page, two modes: with ?token= it's the "set a new password" form;
// without, it's the "request a reset link" form.
export default function ResetPassword() {
    const { t } = useT();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const token = params.get('token') || '';
    usePageMeta({ title: 'Reset password | LDMCalculator', description: 'Reset your account password.' });

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [err, setErr] = useState('');
    const [ok, setOk] = useState('');
    const [loading, setLoading] = useState(false);

    const requestLink = async (e) => {
        e.preventDefault();
        setErr(''); setOk(''); setLoading(true);
        try {
            await api('/api/auth/request-reset', { method: 'POST', auth: false, body: { email: email.trim() } });
            setOk(t('auth.resetRequested'));
        } catch {
            setOk(t('auth.resetRequested')); // never reveal existence
        } finally { setLoading(false); }
    };

    const setNew = async (e) => {
        e.preventDefault();
        setErr(''); setOk(''); setLoading(true);
        try {
            await api('/api/auth/reset-password', { method: 'POST', auth: false, body: { token, password } });
            setOk(t('auth.resetDone'));
            setTimeout(() => navigate('/login'), 1500);
        } catch (e2) {
            setErr(t(`auth.err.${e2.message}`) || t('auth.err.generic'));
        } finally { setLoading(false); }
    };

    if (token) {
        return (
            <AuthShell title={t('auth.resetNewTitle')} subtitle={t('auth.resetNewSubtitle')}>
                <form onSubmit={setNew}>
                    <ErrorMsg>{err}</ErrorMsg>
                    <OkMsg>{ok}</OkMsg>
                    <Field label={t('auth.newPassword')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
                    <SubmitBtn loading={loading}>{t('auth.resetDoneBtn')}</SubmitBtn>
                </form>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            title={t('auth.resetTitle')}
            subtitle={t('auth.resetSubtitle')}
            footer={<Link to="/login" style={{ color: '#60a5fa' }}>{t('auth.loginLink')}</Link>}
        >
            <form onSubmit={requestLink}>
                <ErrorMsg>{err}</ErrorMsg>
                <OkMsg>{ok}</OkMsg>
                <Field label={t('auth.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                <SubmitBtn loading={loading}>{t('auth.resetBtn')}</SubmitBtn>
            </form>
        </AuthShell>
    );
}
