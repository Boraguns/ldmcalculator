import StaticPage from '../StaticPage';
import usePageMeta from '../../hooks/usePageMeta';

// İade ve İptal Politikası (Refund & Cancellation Policy).
// NOTE: Template — must be reviewed by a lawyer before production use.
export default function RefundPolicy() {
    usePageMeta({
        title: 'İade ve İptal Politikası | LDMCalculator',
        description: 'Abonelik iade, iptal ve cayma hakkı politikası.',
        canonical: 'https://ldmcalculator.com/legal/refund-policy',
    });
    const h = { color: '#f8fafc', fontSize: '1.1rem', marginTop: 22 };
    return (
        <StaticPage title="İade ve İptal Politikası">
            <p style={{ color: '#fbbf24', fontSize: '0.85rem' }}>
                ⚠ Bu metin bir taslaktır ve yürürlüğe almadan önce hukuk danışmanı tarafından
                gözden geçirilmelidir. / Template — review by a lawyer before use.
            </p>

            <h3 style={h}>1. Hizmet Niteliği</h3>
            <p>LDMCalculator, dijital içerik ve çevrimiçi yazılım hizmeti (SaaS) sunar. Abonelikler
            aylık veya yıllık olarak satın alınır ve otomatik olarak yenilenir.</p>

            <h3 style={h}>2. Cayma Hakkı</h3>
            <p>6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği
            uyarınca, dijital içeriğin/hizmetin tüketicinin onayı ile ifasına başlanmasından sonra
            cayma hakkı kural olarak kullanılamaz. Hizmeti henüz kullanmaya başlamadıysanız,
            satın alma tarihinden itibaren 14 gün içinde cayma hakkınızı kullanabilirsiniz.</p>

            <h3 style={h}>3. İptal</h3>
            <p>Aboneliğinizi hesap panelinizden dilediğiniz zaman iptal edebilirsiniz. İptal,
            mevcut fatura döneminin sonunda yürürlüğe girer; dönem sonuna kadar hizmete erişiminiz
            devam eder ve sonraki dönem için ücret alınmaz.</p>

            <h3 style={h}>4. İade</h3>
            <p>Cayma hakkının geçerli olduğu durumlarda yapılan ödeme, talebin tarafımıza ulaşmasından
            itibaren 14 gün içinde, ödemede kullanılan yönteme uygun şekilde iade edilir. Kullanılmış
            dönemlere ilişkin kısmi iade yapılmaz. Kurumsal koltuk yükseltmelerinde alınan oransal
            (proration) ücretler, ilgili dönem için ifa edilmiş kabul edilir.</p>

            <h3 style={h}>5. İletişim</h3>
            <p>İptal ve iade talepleriniz için:
            <a href="mailto:destek@ldmcalculator.com" style={{ color: '#60a5fa' }}> destek@ldmcalculator.com</a></p>

            <hr style={{ borderColor: '#1f2937', margin: '26px 0' }} />

            <h3 style={h}>English summary</h3>
            <p>LDMCalculator is a digital SaaS service. Subscriptions are monthly or yearly and renew
            automatically. Under Turkish consumer law, the right of withdrawal generally does not apply
            once performance of the digital service has begun with your consent; if you have not started
            using the service you may withdraw within 14 days of purchase. You can cancel anytime from
            your account panel — cancellation takes effect at the end of the current billing period and
            no further charges are made. Eligible refunds are issued within 14 days; used periods and
            corporate seat-upgrade proration charges are non-refundable.</p>
        </StaticPage>
    );
}
