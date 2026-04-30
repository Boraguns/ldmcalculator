import StaticPage from './StaticPage';
import { useT } from '../i18n/LanguageContext';

const About = () => {
    const { t } = useT();
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
