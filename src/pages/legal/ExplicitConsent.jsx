import StaticPage from '../StaticPage';
import usePageMeta from '../../hooks/usePageMeta';

// Açık Rıza Metni (Explicit consent text under KVKK).
// NOTE: Template — must be reviewed by a lawyer before production use.
export default function ExplicitConsent() {
    usePageMeta({
        title: 'Açık Rıza Metni | LDMCalculator',
        description: 'Kişisel verilerin işlenmesine ilişkin açık rıza metni.',
        canonical: 'https://ldmcalculator.com/legal/explicit-consent',
    });
    return (
        <StaticPage title="Açık Rıza Metni">
            <p style={{ color: '#fbbf24', fontSize: '0.85rem' }}>
                ⚠ Bu metin bir taslaktır ve yürürlüğe almadan önce hukuk danışmanı tarafından
                gözden geçirilmelidir. / Template — review by a lawyer before use.
            </p>

            <p>6698 sayılı KVKK kapsamında hazırlanan Aydınlatma Metni’ni okudum ve anladım.
            Bu çerçevede:</p>

            <ul style={{ lineHeight: 1.8 }}>
                <li>Kimlik ve iletişim bilgilerim ile (varsa) kurumsal bilgilerimin üyelik ve
                hizmetin sunulması amacıyla işlenmesine,</li>
                <li>Abonelik ve ödeme süreçlerinin yürütülmesi ile faturalandırma amacıyla
                gerekli verilerin ödeme kuruluşu (PayTR) ile paylaşılmasına,</li>
                <li>Tarafımca onay verilmesi hâlinde, kampanya ve bilgilendirme amacıyla
                elektronik ileti gönderilmesine (pazarlama izni),</li>
            </ul>

            <p><strong>açık rızamı veriyorum.</strong> Verdiğim açık rızayı dilediğim zaman
            <a href="mailto:kvkk@ldmcalculator.com" style={{ color: '#60a5fa' }}> kvkk@ldmcalculator.com</a>
            adresine başvurarak geri alabileceğimi biliyorum.</p>

            <hr style={{ borderColor: '#1f2937', margin: '26px 0' }} />

            <h3 style={{ color: '#f8fafc', fontSize: '1.1rem' }}>English summary</h3>
            <p>I have read and understood the KVKK information notice and give my explicit consent to
            the processing of my identity, contact and (where applicable) corporate data for membership
            and service delivery, the sharing of necessary data with the payment provider (PayTR) for
            subscription and billing, and — only if I opt in — the sending of marketing communications.
            I may withdraw this consent at any time via kvkk@ldmcalculator.com.</p>
        </StaticPage>
    );
}
