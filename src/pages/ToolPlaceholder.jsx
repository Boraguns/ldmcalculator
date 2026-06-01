import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n/LanguageContext';
import usePageMeta from '../hooks/usePageMeta';

/**
 * Placeholder for document tools whose templates haven't been supplied yet
 * (Invoice, Packing List). Same dark shell as the rest of the app; the real
 * fillable form replaces this once the source template is provided.
 */
const ToolPlaceholder = ({ titleKey }) => {
    const navigate = useNavigate();
    const { t } = useT();
    const title = t(titleKey);
    usePageMeta({ title: `${title} | LDMCalculator`, description: t('tools.soon') });

    return (
        <div style={{
            width: '100vw', minHeight: '100vh', background: '#0f172a',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', color: 'white', position: 'relative', padding: 20
        }}>
            <img
                src="/src/ldm-calculator-beyaz-logo.png"
                alt="LDM Logo"
                onClick={() => navigate('/')}
                style={{ position: 'absolute', top: '2rem', left: '2rem', width: 180, cursor: 'pointer' }}
            />
            <h1 style={{ marginBottom: 8 }}>{title}</h1>
            <p style={{ color: '#94a3b8' }}>{t('tools.soon')}</p>
            <button className="ai-btn" onClick={() => navigate('/')} style={{ marginTop: 20 }}>
                <div className="ai-btn-inner" style={{ padding: '0 20px' }}>{t('tools.back')}</div>
            </button>
        </div>
    );
};

export default ToolPlaceholder;
