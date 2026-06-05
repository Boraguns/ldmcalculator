import StaticPage from '../StaticPage';
import usePageMeta from '../../hooks/usePageMeta';

// KVKK Aydınlatma Metni (Information / Privacy notice under Turkish Law 6698).
// NOTE: This is a good-faith template and MUST be reviewed by a lawyer before
// production use. Replace the bracketed placeholders with your legal entity.
export default function Kvkk() {
    usePageMeta({
        title: 'KVKK Aydınlatma Metni | LDMCalculator',
        description: 'KVKK kapsamında kişisel verilerin işlenmesine ilişkin aydınlatma metni.',
        canonical: 'https://ldmcalculator.com/legal/kvkk',
    });
    const h = { color: '#0f172a', fontSize: '1.1rem', marginTop: 22 };
    return (
        <StaticPage title="KVKK Aydınlatma Metni">
            <p style={{ color: '#b45309', fontSize: '0.85rem' }}>
                ⚠ Bu metin bir taslaktır ve yürürlüğe almadan önce hukuk danışmanı tarafından
                gözden geçirilmelidir. / This is a template and must be reviewed by a lawyer.
            </p>

            <p>İşbu Aydınlatma Metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”)
            uyarınca veri sorumlusu sıfatıyla <strong>[Şirket Unvanı]</strong> (“LDMCalculator”)
            tarafından hazırlanmıştır.</p>

            <h3 style={h}>1. İşlenen Kişisel Veriler</h3>
            <p>Ad-soyad, e-posta adresi, telefon numarası, (kurumsal hesaplarda) firma adı,
            vergi numarası ve adres; ödeme işlemlerine ilişkin işlem kayıtları (kart bilgileri
            tarafımızca saklanmaz, ödeme kuruluşu PayTR tarafından işlenir); IP adresi, çerez
            ve cihaz tanımlayıcıları ile platform kullanım kayıtları.</p>

            <h3 style={h}>2. İşleme Amaçları</h3>
            <p>Üyelik kaydının oluşturulması, hizmetin sunulması, abonelik ve ödeme süreçlerinin
            yürütülmesi, faturalandırma, kullanım limitlerinin uygulanması, müşteri desteği,
            yasal yükümlülüklerin yerine getirilmesi ve hizmet güvenliğinin sağlanması.</p>

            <h3 style={h}>3. Hukuki Sebepler</h3>
            <p>Bir sözleşmenin kurulması veya ifası için gerekli olması, hukuki yükümlülüğün
            yerine getirilmesi, meşru menfaat ve açık rızanız (örn. pazarlama iletişimi).</p>

            <h3 style={h}>4. Aktarım</h3>
            <p>Kişisel verileriniz; ödeme hizmet sağlayıcısı (PayTR), e-posta gönderim sağlayıcısı,
            barındırma/altyapı sağlayıcıları ve yasal olarak yetkili kamu kurumları ile sınırlı
            ve amaçla bağlı olarak paylaşılabilir.</p>

            <h3 style={h}>5. Saklama Süresi</h3>
            <p>Veriler, ilgili mevzuatta öngörülen süreler ve işleme amacının gerektirdiği süre
            boyunca saklanır; sürenin sonunda silinir, yok edilir veya anonim hâle getirilir.</p>

            <h3 style={h}>6. Haklarınız (KVKK m.11)</h3>
            <p>Kişisel verilerinizin işlenip işlenmediğini öğrenme, düzeltme, silme, işlemeye itiraz
            etme ve zararın giderilmesini talep etme haklarına sahipsiniz. Taleplerinizi
            <a href="mailto:kvkk@ldmcalculator.com" style={{ color: '#2563eb' }}> kvkk@ldmcalculator.com</a> adresine iletebilirsiniz.</p>

            <hr style={{ borderColor: '#1f2937', margin: '26px 0' }} />

            <h3 style={h}>English summary</h3>
            <p>Under Turkish Personal Data Protection Law (KVKK No. 6698), LDMCalculator processes
            your name, email, phone, (for corporate accounts) company name, tax number and address,
            payment transaction records (card data is handled by PayTR, not stored by us), and usage
            data (IP, cookies, device identifiers) to operate the service, manage subscriptions and
            billing, enforce usage limits, provide support and comply with legal obligations. You may
            exercise your rights of access, rectification, erasure and objection by contacting
            kvkk@ldmcalculator.com.</p>
        </StaticPage>
    );
}
