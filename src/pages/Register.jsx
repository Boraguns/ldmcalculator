import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell, { Field, SubmitBtn, ErrorMsg } from '../components/AuthShell';
import { useAuth } from '../auth/AuthContext';
import { api, setToken } from '../utils/api';
import { useT } from '../i18n/LanguageContext';
import usePageMeta from '../hooks/usePageMeta';

const Check = ({ checked, onChange, children }) => (
    <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10, color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.4 }}>
        <input type="checkbox" checked={checked} onChange={onChange} style={{ marginTop: 3 }} />
        <span>{children}</span>
    </label>
);

export default function Register() {
    const { t } = useT();
    const { register, refresh } = useAuth();
    const navigate = useNavigate();
    usePageMeta({ title: 'Register | LDMCalculator', description: 'Create your LDMCalculator account.' });

    const [type, setType] = useState('individual'); // individual | corporate
    const [f, setF] = useState({
        firstName: '', lastName: '', email: '', phone: '', password: '',
        companyName: '', taxNumber: '', taxOffice: '', address: '',
    });
    const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
    const [acceptKvkk, setAcceptKvkk] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [acceptExplicit, setAcceptExplicit] = useState(false);
    const [acceptMarketing, setAcceptMarketing] = useState(false);
    const [err, setErr] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setErr('');
        if (!acceptKvkk || !acceptTerms || !acceptExplicit) { setErr(t('auth.err.consent_required')); return; }
        setLoading(true);
        try {
            const consents = ['kvkk', 'terms', 'explicit'];
            if (acceptMarketing) consents.push('marketing');
            if (type === 'corporate') {
                const j = await api('/api/company/create', {
                    method: 'POST', auth: false,
                    body: {
                        firstName: f.firstName, lastName: f.lastName, email: f.email.trim(),
                        phone: f.phone, password: f.password,
                        companyName: f.companyName, taxNumber: f.taxNumber, taxOffice: f.taxOffice,
                        address: f.address, acceptKvkk, acceptTerms, acceptExplicit, acceptMarketing,
                    },
                });
                setToken(j.token);
                await refresh();
            } else {
                await register({
                    firstName: f.firstName, lastName: f.lastName, email: f.email.trim(),
                    phone: f.phone, password: f.password,
                    acceptKvkk, acceptTerms, acceptExplicit, acceptMarketing,
                });
            }
            navigate('/account');
        } catch (e2) {
            setErr(t(`auth.err.${e2.message}`) || t('auth.err.generic'));
        } finally { setLoading(false); }
    };

    const Seg = ({ id, label }) => (
        <button type="button" onClick={() => setType(id)} style={{
            flex: 1, height: 40, border: '1px solid #334155', cursor: 'pointer',
            background: type === id ? '#3b82f6' : 'transparent', color: type === id ? '#fff' : '#94a3b8',
            borderRadius: 8, fontWeight: 600, fontSize: '0.88rem',
        }}>{label}</button>
    );

    return (
        <AuthShell
            title={t('auth.registerTitle')}
            subtitle={t('auth.registerSubtitle')}
            wide={type === 'corporate'}
            footer={<>{t('auth.haveAccount')} <Link to="/login" style={{ color: '#60a5fa' }}>{t('auth.loginLink')}</Link></>}
        >
            <form onSubmit={submit}>
                <ErrorMsg>{err}</ErrorMsg>
                <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                    <Seg id="individual" label={t('auth.individual')} />
                    <Seg id="corporate" label={t('auth.corporate')} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label={t('auth.firstName')} value={f.firstName} onChange={set('firstName')} autoComplete="given-name" required />
                    <Field label={t('auth.lastName')} value={f.lastName} onChange={set('lastName')} autoComplete="family-name" required />
                </div>
                <Field label={t('auth.email')} type="email" value={f.email} onChange={set('email')} autoComplete="email" required />
                <Field label={t('auth.phone')} value={f.phone} onChange={set('phone')} autoComplete="tel" />
                <Field label={t('auth.password')} type="password" value={f.password} onChange={set('password')} autoComplete="new-password" required />

                {type === 'corporate' && (
                    <div style={{ borderTop: '1px solid #1f2937', marginTop: 6, paddingTop: 14 }}>
                        <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: '0 0 12px', fontWeight: 600 }}>{t('auth.companyInfo')}</p>
                        <Field label={t('auth.companyName')} value={f.companyName} onChange={set('companyName')} required />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <Field label={t('auth.taxNumber')} value={f.taxNumber} onChange={set('taxNumber')} required />
                            <Field label={t('auth.taxOffice')} value={f.taxOffice} onChange={set('taxOffice')} />
                        </div>
                        <Field label={t('auth.address')} value={f.address} onChange={set('address')} />
                        <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 14px' }}>{t('auth.corporateSeatsNote')}</p>
                    </div>
                )}

                <div style={{ marginTop: 8, marginBottom: 16 }}>
                    <Check checked={acceptKvkk} onChange={(e) => setAcceptKvkk(e.target.checked)}>
                        {t('auth.kvkkConsent')} <Link to="/legal/kvkk" target="_blank" style={{ color: '#60a5fa' }}>{t('legal.kvkkTitle')}</Link>
                    </Check>
                    <Check checked={acceptExplicit} onChange={(e) => setAcceptExplicit(e.target.checked)}>
                        {t('auth.explicitConsent')} <Link to="/legal/explicit-consent" target="_blank" style={{ color: '#60a5fa' }}>{t('legal.explicitTitle')}</Link>
                    </Check>
                    <Check checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)}>
                        {t('auth.termsConsent')} <Link to="/terms" target="_blank" style={{ color: '#60a5fa' }}>{t('legal.termsTitle')}</Link>
                    </Check>
                    <Check checked={acceptMarketing} onChange={(e) => setAcceptMarketing(e.target.checked)}>
                        {t('auth.marketingConsent')}
                    </Check>
                </div>

                <SubmitBtn loading={loading}>{t('auth.registerBtn')}</SubmitBtn>
            </form>
        </AuthShell>
    );
}
