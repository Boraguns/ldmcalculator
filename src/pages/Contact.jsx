import { useState } from 'react';
import StaticPage from './StaticPage';
import { useT } from '../i18n/LanguageContext';

const inputStyle = {
    width: '100%',
    background: '#0f172a',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#f1f5f9',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: '0.95rem',
    fontFamily: 'inherit'
};

const Contact = () => {
    const { t } = useT();
    const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
    const [status, setStatus] = useState('idle'); // idle | sending | sent | error

    const submit = async (e) => {
        e.preventDefault();
        setStatus('sending');
        try {
            const r = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (!r.ok) throw new Error('bad response');
            setStatus('sent');
            setForm({ name: '', email: '', subject: '', message: '' });
        } catch {
            setStatus('error');
        }
    };

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    return (
        <StaticPage title={t('contact.title')}>
            <p style={{ color: '#94a3b8', marginTop: 0 }}>{t('contact.intro')}</p>
            <p style={{ marginBottom: 20 }}>
                <a href="mailto:info@ldmcalculator.com" style={{ color: '#60a5fa' }}>info@ldmcalculator.com</a>
            </p>
            <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
                <input style={inputStyle} placeholder={t('contact.name')} value={form.name} onChange={set('name')} required />
                <input style={inputStyle} placeholder={t('contact.email')} type="email" value={form.email} onChange={set('email')} required />
                <input style={inputStyle} placeholder={t('contact.subject')} value={form.subject} onChange={set('subject')} />
                <textarea style={{ ...inputStyle, minHeight: 140, resize: 'vertical' }} placeholder={t('contact.message')} value={form.message} onChange={set('message')} required />
                <button className="ai-btn ai-btn-primary" type="submit" disabled={status === 'sending'} style={{ height: 44, padding: 2 }}>
                    <div className="ai-btn-inner" style={{ background: '#3b82f6', color: 'white', borderRadius: 10, height: '100%' }}>
                        {status === 'sending' ? '...' : t('contact.send')}
                    </div>
                </button>
                {status === 'sent'  && <div style={{ color: '#10b981' }}>{t('contact.sent')}</div>}
                {status === 'error' && <div style={{ color: '#ef4444' }}>{t('contact.error')}</div>}
            </form>
        </StaticPage>
    );
};
export default Contact;
