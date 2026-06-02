// Strings for the payment-method column shown in the account payment history and
// admin payments tab: "IBAN/EFT" for manually approved subscriptions and credit
// card for PayTR-paid ones.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const DATA = {
    en: { account: { method: 'Method', method_manual: 'Bank transfer (IBAN/EFT)', method_card: 'Credit card' } },
    tr: { account: { method: 'Yöntem', method_manual: 'Havale/EFT (IBAN)', method_card: 'Kredi kartı' } },
    de: { account: { method: 'Methode', method_manual: 'Banküberweisung (IBAN/EFT)', method_card: 'Kreditkarte' } },
    ru: { account: { method: 'Способ', method_manual: 'Банковский перевод (IBAN/EFT)', method_card: 'Кредитная карта' } },
    fr: { account: { method: 'Méthode', method_manual: 'Virement bancaire (IBAN/EFT)', method_card: 'Carte de crédit' } },
    ar: { account: { method: 'الطريقة', method_manual: 'تحويل بنكي (IBAN/EFT)', method_card: 'بطاقة ائتمان' } },
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
