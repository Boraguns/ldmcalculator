import { useState } from 'react';
import StaticPage from './StaticPage';
import { useT } from '../i18n/LanguageContext';
import usePageMeta from '../hooks/usePageMeta';

const inputStyle = {
    width: '100%',
    background: '#fbf8f1',
    border: '1px solid #d8cfbd',
    color: '#1e293b',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: '0.95rem',
    fontFamily: 'inherit'
};

const Advertise = () => {
    const { t } = useT();
    usePageMeta({
        title: 'Advertise on LDMCalculator — Reach Logistics & Freight Professionals',
        description: 'Promote your logistics, freight or fleet brand to LDMCalculator users — operators planning truck, container, air and sea cargo loads worldwide.',
        canonical: 'https://ldmcalculator.com/advertise'
    });
    const [form, setForm] = useState({ company_name: '', contact_name: '', email: '', phone: '', budget: '', message: '' });
    const [status, setStatus] = useState('idle');

    const submit = async (e) => {
        e.preventDefault();
        setStatus('sending');
        try {
            const r = await fetch('/api/advertise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (!r.ok) throw new Error('bad');
            setStatus('sent');
            setForm({ company_name: '', contact_name: '', email: '', phone: '', budget: '', message: '' });
        } catch { setStatus('error'); }
    };
    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    return (
        <StaticPage title={t('advertise.title')}>
            <p style={{ color: '#475569', marginTop: 0 }}>{t('advertise.intro')}</p>
            <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
                <input style={inputStyle} placeholder={t('advertise.company')} value={form.company_name} onChange={set('company_name')} required />
                <input style={inputStyle} placeholder={t('advertise.contact')} value={form.contact_name} onChange={set('contact_name')} required />
                <input style={inputStyle} placeholder={t('advertise.email')} type="email" value={form.email} onChange={set('email')} required />
                <input style={inputStyle} placeholder={t('advertise.phone')} value={form.phone} onChange={set('phone')} />
                <input style={inputStyle} placeholder={t('advertise.budget')} value={form.budget} onChange={set('budget')} />
                <textarea style={{ ...inputStyle, minHeight: 130, resize: 'vertical' }} placeholder={t('advertise.message')} value={form.message} onChange={set('message')} />
                <button className="ai-btn ai-btn-primary" type="submit" disabled={status === 'sending'} style={{ height: 44, padding: 2 }}>
                    <div className="ai-btn-inner" style={{ background: '#3b82f6', color: 'white', borderRadius: 10, height: '100%' }}>
                        {status === 'sending' ? '...' : t('advertise.send')}
                    </div>
                </button>
                {status === 'sent' && <div style={{ color: '#10b981' }}>{t('contact.sent')}</div>}
                {status === 'error' && <div style={{ color: '#ef4444' }}>{t('contact.error')}</div>}
            </form>
        </StaticPage>
    );
};
export default Advertise;
