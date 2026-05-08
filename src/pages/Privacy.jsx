import StaticPage from './StaticPage';
import { useT } from '../i18n/LanguageContext';
import usePageMeta from '../hooks/usePageMeta';

const Privacy = () => {
    const { t } = useT();
    usePageMeta({
        title: 'Privacy Policy | LDMCalculator',
        description: 'How LDMCalculator collects, uses and protects information when you plan cargo loads with our free 3D LDM calculator.',
        canonical: 'https://ldmcalculator.com/privacy'
    });
    return (
        <StaticPage title={t('legal.privacyTitle')}>
            <p>{t('legal.privacyBody')}</p>
        </StaticPage>
    );
};
export default Privacy;
