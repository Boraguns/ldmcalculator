import StaticPage from './StaticPage';
import { useT } from '../i18n/LanguageContext';
import usePageMeta from '../hooks/usePageMeta';

const About = () => {
    const { t } = useT();
    usePageMeta({
        title: 'About LDMCalculator — The Free 3D Cargo Load Planner',
        description: 'Learn about LDMCalculator, the free online 3D loading meter and cargo planning tool used by logistics professionals to plan trucks, containers, planes and ships.',
        canonical: 'https://ldmcalculator.com/about'
    });
    return (
        <StaticPage title={t('legal.aboutTitle')}>
            <p>{t('legal.aboutBody')}</p>
            <p style={{ marginTop: 16, color: '#94a3b8' }}>
                <a href="mailto:info@ldmcalculator.com" style={{ color: '#60a5fa' }}>info@ldmcalculator.com</a>
            </p>
        </StaticPage>
    );
};
export default About;
