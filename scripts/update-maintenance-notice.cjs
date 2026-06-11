const fs = require('fs');
const path = require('path');

const vals = {
  tr: {
    title: 'Bilgilendirme',
    body: "Değerli Kullanıcımız,\nLDM Calculator'ı, size daha doğru ve kullanışlı bir hesaplama deneyimi sunmak amacıyla güncelliyoruz. Bu geliştirme sürecinde hesaplamalarda geçici hatalar veya tutarsızlıklar görülebilir. En güncel ve geliştirilmiş sürümümüzle kısa süre içinde yeniden hizmetinizde olacağız.\nAnlayışınız için teşekkür ederiz.",
    ok: 'Anladım',
  },
  en: {
    title: 'Notice',
    body: 'Dear User,\nWe are currently updating LDM Calculator to provide you with a more accurate and convenient calculation experience. During this improvement, you may occasionally encounter temporary errors or inconsistencies in the results. We will be back shortly with our latest, enhanced version.\nThank you for your understanding.',
    ok: 'Got it',
  },
  de: {
    title: 'Hinweis',
    body: 'Sehr geehrte Nutzerin, sehr geehrter Nutzer,\nwir aktualisieren LDM Calculator, um Ihnen ein genaueres und komfortableres Berechnungserlebnis zu bieten. Während dieser Verbesserung kann es vorübergehend zu Fehlern oder Abweichungen in den Ergebnissen kommen. In Kürze sind wir mit unserer neuesten, optimierten Version wieder für Sie da.\nVielen Dank für Ihr Verständnis.',
    ok: 'Verstanden',
  },
  ru: {
    title: 'Уведомление',
    body: 'Уважаемый пользователь,\nМы обновляем LDM Calculator, чтобы предоставить вам более точные и удобные расчёты. В период этих улучшений в результатах возможны временные ошибки или неточности. В ближайшее время мы вернёмся с обновлённой, улучшенной версией.\nБлагодарим за понимание.',
    ok: 'Понятно',
  },
  fr: {
    title: 'Information',
    body: "Cher utilisateur,\nNous mettons à jour LDM Calculator afin de vous offrir une expérience de calcul plus précise et plus pratique. Pendant cette amélioration, des erreurs ou incohérences temporaires peuvent apparaître dans les résultats. Nous serons de retour très prochainement avec notre dernière version améliorée.\nMerci de votre compréhension.",
    ok: "J'ai compris",
  },
  ar: {
    title: 'إشعار',
    body: 'عزيزنا المستخدم،\nنقوم بتحديث LDM Calculator لنقدّم لك تجربة حساب أكثر دقة وسهولة. خلال هذه الفترة قد تظهر أخطاء أو تباينات مؤقتة في النتائج. سنعود قريبًا بأحدث نسخة محسّنة.\nشكرًا لتفهمكم.',
    ok: 'حسنًا',
  },
};

for (const [lang, kv] of Object.entries(vals)) {
  const file = path.join(__dirname, '..', 'src', 'i18n', 'locales', `${lang}.json`);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.maintenance = { title: kv.title, body: kv.body, ok: kv.ok };
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  console.log(`${lang}: maintenance.* updated`);
}
