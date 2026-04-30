import StaticPage from './StaticPage';
import { useT } from '../i18n/LanguageContext';

const Terms = () => {
    const { t } = useT();
    return (
        <StaticPage title={t('legal.termsTitle')}>
            <p>{t('legal.termsBody')}</p>
        </StaticPage>
    );
};
export default Terms;
