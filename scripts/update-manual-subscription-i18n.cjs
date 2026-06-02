// Strings for the manual subscription-approval flow used while PayTR is not
// live: a "request received" confirmation on the pricing page and an
// "awaiting approval" notice on the account page.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const DATA = {
    en: {
        pricing: { requestReceived: "Your subscription request has been received. We'll review and activate it shortly." },
        account: { subPending: "Your subscription request is awaiting approval. You'll get access as soon as it's confirmed." },
    },
    tr: {
        pricing: { requestReceived: 'Abonelik talebiniz alındı. En kısa sürede inceleyip etkinleştireceğiz.' },
        account: { subPending: 'Abonelik talebiniz onay bekliyor. Onaylandığı anda erişiminiz açılacaktır.' },
    },
    de: {
        pricing: { requestReceived: 'Ihre Abo-Anfrage ist eingegangen. Wir prüfen und aktivieren sie in Kürze.' },
        account: { subPending: 'Ihre Abo-Anfrage wartet auf Freigabe. Sobald sie bestätigt ist, erhalten Sie Zugriff.' },
    },
    ru: {
        pricing: { requestReceived: 'Ваш запрос на подписку получен. Мы рассмотрим и активируем его в ближайшее время.' },
        account: { subPending: 'Ваш запрос на подписку ожидает подтверждения. Доступ откроется сразу после одобрения.' },
    },
    fr: {
        pricing: { requestReceived: "Votre demande d'abonnement a été reçue. Nous l'examinerons et l'activerons sous peu." },
        account: { subPending: "Votre demande d'abonnement est en attente d'approbation. Vous aurez accès dès sa confirmation." },
    },
    ar: {
        pricing: { requestReceived: 'تم استلام طلب اشتراكك. سنراجعه ونفعّله قريبًا.' },
        account: { subPending: 'طلب اشتراكك في انتظار الموافقة. ستحصل على حق الوصول فور تأكيده.' },
    },
};

for (const [lang, sections] of Object.entries(DATA)) {
    const file = path.join(dir, `${lang}.json`);
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const [section, pairs] of Object.entries(sections)) {
        j[section] = j[section] || {};
        Object.assign(j[section], pairs);
    }
    fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
    console.log(`updated ${lang}.json`);
}
