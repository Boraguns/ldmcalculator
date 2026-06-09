import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthShell, { Field, SubmitBtn, ErrorMsg } from '../components/AuthShell';
import { useAuth } from '../auth/AuthContext';
import { useT } from '../i18n/LanguageContext';
import usePageMeta from '../hooks/usePageMeta';

export default function Login() {
    const { t } = useT();
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    // When the user was sent here from the paywall on a work page, return them
    // there afterwards (their input is auto-saved as a draft) instead of /account.
    const from = location.state?.from;
    usePageMeta({ title: 'Login | LDMCalculator', description: 'Sign in to your LDMCalculator account.' });

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [err, setErr] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setErr(''); setLoading(true);
        try {
            await login(email.trim(), password);
            navigate(from || '/account');
        } catch (e2) {
            setErr(t(`auth.err.${e2.message}`) || t('auth.err.generic'));
        } finally { setLoading(false); }
    };

    return (
        <AuthShell
            title={t('auth.loginTitle')}
            subtitle={t('auth.loginSubtitle')}
            bgImage
            footer={<>{t('auth.noAccount')} <Link to="/register" state={from ? { from } : undefined} style={{ color: '#60a5fa' }}>{t('auth.registerLink')}</Link></>}
        >
            <form onSubmit={submit}>
                <ErrorMsg>{err}</ErrorMsg>
                <Field label={t('auth.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                <Field label={t('auth.password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
                <div style={{ textAlign: 'right', marginBottom: 16 }}>
                    <Link to="/reset-password" style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('auth.forgot')}</Link>
                </div>
                <SubmitBtn loading={loading}>{t('auth.loginBtn')}</SubmitBtn>
            </form>
        </AuthShell>
    );
}
