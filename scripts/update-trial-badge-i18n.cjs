// Add account-tier badge + trial-countdown strings and reword the paywall copy
// now that the free allowance is a one-time lifetime trial (not a daily reset).
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const DATA = {
    en: {
        account: {
            tierFree: 'Free Account',
            tierPremium: '👑 Premium Account',
            trialsLeft: '{n} free trials left',
        },
        paywall: {
            title: 'Free trial used up',
            anonBody: "You've used your {limit} free trials. Create a free account for more, or subscribe for unlimited access.",
            freeBody: "You've used your {limit} free trials. Subscribe for unlimited access.",
        },
    },
    tr: {
        account: {
            tierFree: 'Ücretsiz Hesap',
            tierPremium: '👑 Premium Hesap',
            trialsLeft: '{n} deneme hakkınız kaldı',
        },
        paywall: {
            title: 'Ücretsiz deneme hakkınız doldu',
            anonBody: '{limit} ücretsiz deneme hakkınızı kullandınız. Daha fazlası için ücretsiz hesap oluşturun veya sınırsız erişim için abone olun.',
            freeBody: '{limit} ücretsiz deneme hakkınızı kullandınız. Sınırsız erişim için abone olun.',
        },
    },
    de: {
        account: {
            tierFree: 'Kostenloses Konto',
            tierPremium: '👑 Premium-Konto',
            trialsLeft: '{n} Versuche übrig',
        },
        paywall: {
            title: 'Kostenlose Testphase aufgebraucht',
            anonBody: 'Sie haben Ihre {limit} kostenlosen Versuche aufgebraucht. Erstellen Sie ein kostenloses Konto für mehr oder abonnieren Sie für unbegrenzten Zugriff.',
            freeBody: 'Sie haben Ihre {limit} kostenlosen Versuche aufgebraucht. Abonnieren Sie für unbegrenzten Zugriff.',
        },
    },
    ru: {
        account: {
            tierFree: 'Бесплатный аккаунт',
            tierPremium: '👑 Премиум-аккаунт',
            trialsLeft: 'Осталось попыток: {n}',
        },
        paywall: {
            title: 'Бесплатные попытки закончились',
            anonBody: 'Вы использовали свои бесплатные попытки ({limit}). Создайте бесплатный аккаунт, чтобы получить больше, или оформите подписку для безлимитного доступа.',
            freeBody: 'Вы использовали свои бесплатные попытки ({limit}). Оформите подписку для безлимитного доступа.',
        },
    },
    fr: {
        account: {
            tierFree: 'Compte gratuit',
            tierPremium: '👑 Compte Premium',
            trialsLeft: '{n} essais restants',
        },
        paywall: {
            title: 'Essai gratuit épuisé',
            anonBody: 'Vous avez utilisé vos {limit} essais gratuits. Créez un compte gratuit pour en obtenir plus, ou abonnez-vous pour un accès illimité.',
            freeBody: 'Vous avez utilisé vos {limit} essais gratuits. Abonnez-vous pour un accès illimité.',
        },
    },
    ar: {
        account: {
            tierFree: 'حساب مجاني',
            tierPremium: '👑 حساب مميز',
            trialsLeft: 'متبقٍ {n} محاولة',
        },
        paywall: {
            title: 'انتهت النسخة التجريبية المجانية',
            anonBody: 'لقد استخدمت محاولاتك المجانية ({limit}). أنشئ حسابًا مجانيًا للمزيد، أو اشترك للوصول غير المحدود.',
            freeBody: 'لقد استخدمت محاولاتك المجانية ({limit}). اشترك للوصول غير المحدود.',
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
