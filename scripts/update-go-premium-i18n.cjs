// "Go premium" caption shown under the account button for non-premium users,
// linking to the pricing page.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const DATA = {
    en: { nav: { goPremium: 'Go Premium' } },
    tr: { nav: { goPremium: 'Premium Ol' } },
    de: { nav: { goPremium: 'Premium holen' } },
    ru: { nav: { goPremium: 'Перейти на Premium' } },
    fr: { nav: { goPremium: 'Passer Premium' } },
    ar: { nav: { goPremium: 'اشترك في Premium' } },
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
