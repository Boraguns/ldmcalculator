import StaticPage from './StaticPage';
import { useT } from '../i18n/LanguageContext';

const Privacy = () => {
    const { t } = useT();
    return (
        <StaticPage title={t('legal.privacyTitle')}>
            <p>{t('legal.privacyBody')}</p>
        </StaticPage>
    );
};
export default Privacy;
