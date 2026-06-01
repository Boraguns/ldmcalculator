import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import AuthShell, { Field, SubmitBtn, ErrorMsg } from '../components/AuthShell';
import { api, setToken } from '../utils/api';
import { useAuth } from '../auth/AuthContext';
import { useT } from '../i18n/LanguageContext';
import usePageMeta from '../hooks/usePageMeta';

export default function AcceptInvite() {
    const { t } = useT();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { refresh } = useAuth();
    const token = params.get('token') || '';
    usePageMeta({ title: 'Accept invite | LDMCalculator', description: 'Join your company on LDMCalculator.' });

    const [f, setF] = useState({ firstName: '', lastName: '', password: '' });
    const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
    const [err, setErr] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setErr(''); setLoading(true);
        try {
            const j = await api('/api/company/accept-invite', {
                method: 'POST', auth: false, body: { token, ...f },
            });
            setToken(j.token);
            await refresh();
            navigate('/account');
        } catch (e2) {
            setErr(t(`auth.err.${e2.message}`) || t('auth.err.generic'));
        } finally { setLoading(false); }
    };

    if (!token) {
        return (
            <AuthShell title={t('invite.title')}>
                <ErrorMsg>{t('invite.noToken')}</ErrorMsg>
                <Link to="/" style={{ color: '#60a5fa' }}>{t('viewer.backHome')}</Link>
            </AuthShell>
        );
    }

    return (
        <AuthShell title={t('invite.title')} subtitle={t('invite.subtitle')}>
            <form onSubmit={submit}>
                <ErrorMsg>{err}</ErrorMsg>
                <Field label={t('auth.firstName')} value={f.firstName} onChange={set('firstName')} required />
                <Field label={t('auth.lastName')} value={f.lastName} onChange={set('lastName')} required />
                <Field label={t('auth.password')} type="password" value={f.password} onChange={set('password')} autoComplete="new-password" required />
                <SubmitBtn loading={loading}>{t('invite.join')}</SubmitBtn>
            </form>
        </AuthShell>
    );
}
