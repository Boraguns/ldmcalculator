// Adds resend-verification i18n keys under "account" for all 6 locales.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const data = {
    en: { verifyResend: 'Resend verification email', verifySending: 'Sending…', verifySent: 'Verification email sent', verifyError: 'Could not send. Try again.' },
    tr: { verifyResend: 'Doğrulama e-postasını yeniden gönder', verifySending: 'Gönderiliyor…', verifySent: 'Doğrulama e-postası gönderildi', verifyError: 'Gönderilemedi. Tekrar deneyin.' },
    de: { verifyResend: 'Bestätigungs-E-Mail erneut senden', verifySending: 'Senden…', verifySent: 'Bestätigungs-E-Mail gesendet', verifyError: 'Senden fehlgeschlagen. Erneut versuchen.' },
    ru: { verifyResend: 'Отправить письмо повторно', verifySending: 'Отправка…', verifySent: 'Письмо отправлено', verifyError: 'Не удалось отправить. Повторите.' },
    fr: { verifyResend: "Renvoyer l'e-mail de vérification", verifySending: 'Envoi…', verifySent: 'E-mail de vérification envoyé', verifyError: "Échec de l'envoi. Réessayez." },
    ar: { verifyResend: 'إعادة إرسال بريد التأكيد', verifySending: 'جارٍ الإرسال…', verifySent: 'تم إرسال بريد التأكيد', verifyError: 'تعذّر الإرسال. حاول مرة أخرى.' },
};

for (const [lang, keys] of Object.entries(data)) {
    const file = path.join(dir, `${lang}.json`);
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    j.account = j.account || {};
    Object.assign(j.account, keys);
    fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
    console.log('updated', lang);
}
