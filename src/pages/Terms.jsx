import StaticPage from './StaticPage';
import { useT } from '../i18n/LanguageContext';
import usePageMeta from '../hooks/usePageMeta';

const Terms = () => {
    const { t } = useT();
    usePageMeta({
        title: 'Terms of Service | LDMCalculator',
        description: 'The terms and conditions for using LDMCalculator, the free online 3D cargo loading and LDM planning calculator.',
        canonical: 'https://ldmcalculator.com/terms'
    });
    return (
        <StaticPage title={t('legal.termsTitle')}>
            <p>{t('legal.termsBody')}</p>
        </StaticPage>
    );
};
export default Terms;
