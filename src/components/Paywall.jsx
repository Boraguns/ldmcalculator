// App-wide paywall modal shown when a visitor exhausts the daily free quota.
// Anonymous visitors are nudged to register (more free uses) or subscribe;
// free registered users are nudged straight to a subscription.
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n/LanguageContext';

export default function Paywall({ status, onClose }) {
    const { t } = useT();
    const navigate = useNavigate();
    const tier = status?.tier || 'anon';
    const limit = status?.limit;

    const go = (path) => { onClose?.(); navigate(path); };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 5000 }}>
            <div className="ldm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
                <div style={{ textAlign: 'center', fontSize: 40, marginBottom: 8 }}>🔒</div>
                <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: 12 }}>
                    {t('paywall.title')}
                </h2>
                <p style={{ color: '#cbd5e1', textAlign: 'center', lineHeight: 1.5, marginBottom: 22 }}>
                    {tier === 'anon'
                        ? t('paywall.anonBody', { limit })
                        : t('paywall.freeBody', { limit })}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button className="ai-btn ai-btn-primary" onClick={() => go('/pricing')} style={{ height: 46 }}>
                        <div className="ai-btn-inner" style={{ background: '#3b82f6', color: '#fff' }}>
                            {t('paywall.subscribe')}
                        </div>
                    </button>

                    {tier === 'anon' && (
                        <button className="ai-btn" onClick={() => go('/register')} style={{ height: 44 }}>
                            <div className="ai-btn-inner">{t('paywall.register')}</div>
                        </button>
                    )}

                    {tier === 'anon' && (
                        <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', margin: '4px 0 0' }}>
                            {t('paywall.haveAccount')}{' '}
                            <a onClick={() => go('/login')} style={{ color: '#60a5fa', cursor: 'pointer' }}>
                                {t('paywall.login')}
                            </a>
                        </p>
                    )}

                    <button className="ai-btn" onClick={onClose} style={{ height: 40, marginTop: 4 }}>
                        <div className="ai-btn-inner" style={{ background: 'transparent', color: '#94a3b8' }}>
                            {t('paywall.later')}
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
