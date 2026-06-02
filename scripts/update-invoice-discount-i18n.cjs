// Adds discount-type i18n keys (amount/percent toggle) to invoice.form.* across all locales.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const VALUES = {
    en: { discountType: 'Discount type', discountAmount: 'Fixed amount', discountPercent: 'Percentage' },
    tr: { discountType: 'İndirim türü', discountAmount: 'Tutar', discountPercent: 'Yüzde' },
    de: { discountType: 'Rabattart', discountAmount: 'Fester Betrag', discountPercent: 'Prozentsatz' },
    ru: { discountType: 'Тип скидки', discountAmount: 'Сумма', discountPercent: 'Процент' },
    fr: { discountType: 'Type de remise', discountAmount: 'Montant fixe', discountPercent: 'Pourcentage' },
    ar: { discountType: 'نوع الخصم', discountAmount: 'مبلغ ثابت', discountPercent: 'نسبة مئوية' },
};

for (const [lang, vals] of Object.entries(VALUES)) {
    const file = path.join(dir, `${lang}.json`);
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    j.invoice = j.invoice || {};
    j.invoice.form = j.invoice.form || {};
    Object.assign(j.invoice.form, vals);
    fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
    console.log(`updated ${lang}.json`);
}
