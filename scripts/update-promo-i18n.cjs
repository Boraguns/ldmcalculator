// Limited-time launch promo strings for the pricing page: a banner announcing
// all plans are temporarily free, a "free now" badge on each price, and a
// "start free" CTA on the subscribe buttons.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const DATA = {
    en: {
        pricing: {
            promoTitle: 'Limited time: all plans are free!',
            promoDesc: 'Subscribe now and your access opens instantly. This offer is available for a short time only.',
            freeNow: 'Free now',
            startFree: 'Start free',
        },
    },
    tr: {
        pricing: {
            promoTitle: 'Kısa süreliğine: tüm planlar ücretsiz!',
            promoDesc: 'Hemen abone olun, erişiminiz anında açılsın. Bu fırsat yalnızca kısa bir süre için geçerlidir.',
            freeNow: 'Şimdi ücretsiz',
            startFree: 'Ücretsiz başla',
        },
    },
    de: {
        pricing: {
            promoTitle: 'Begrenzte Zeit: alle Pakete kostenlos!',
            promoDesc: 'Jetzt abonnieren und Ihr Zugang wird sofort freigeschaltet. Dieses Angebot gilt nur für kurze Zeit.',
            freeNow: 'Jetzt kostenlos',
            startFree: 'Kostenlos starten',
        },
    },
    ru: {
        pricing: {
            promoTitle: 'Ограниченное время: все тарифы бесплатны!',
            promoDesc: 'Оформите подписку сейчас — доступ откроется мгновенно. Предложение действует только короткое время.',
            freeNow: 'Сейчас бесплатно',
            startFree: 'Начать бесплатно',
        },
    },
    fr: {
        pricing: {
            promoTitle: 'Durée limitée : tous les forfaits sont gratuits !',
            promoDesc: "Abonnez-vous maintenant et votre accès s'ouvre instantanément. Cette offre n'est valable que pour une courte durée.",
            freeNow: 'Gratuit maintenant',
            startFree: 'Commencer gratuitement',
        },
    },
    ar: {
        pricing: {
            promoTitle: 'لفترة محدودة: جميع الباقات مجانية!',
            promoDesc: 'اشترك الآن وسيُفتح وصولك فورًا. هذا العرض متاح لفترة قصيرة فقط.',
            freeNow: 'مجاني الآن',
            startFree: 'ابدأ مجانًا',
        },
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
