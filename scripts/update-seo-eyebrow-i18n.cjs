// Small "eyebrow" label shown above the homepage SEO/FAQ section heading,
// part of the lighter logistics-themed redesign of that band.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const DATA = {
    en: { home: { seo: { eyebrow: 'Logistics calculation tools' } } },
    tr: { home: { seo: { eyebrow: 'Lojistik Hesaplama Araçları' } } },
    de: { home: { seo: { eyebrow: 'Logistik-Rechentools' } } },
    ru: { home: { seo: { eyebrow: 'Инструменты логистических расчётов' } } },
    fr: { home: { seo: { eyebrow: 'Outils de calcul logistique' } } },
    ar: { home: { seo: { eyebrow: 'أدوات الحساب اللوجستي' } } },
};

for (const [lang, sections] of Object.entries(DATA)) {
    const file = path.join(dir, `${lang}.json`);
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const [section, sub] of Object.entries(sections)) {
        j[section] = j[section] || {};
        for (const [group, pairs] of Object.entries(sub)) {
            j[section][group] = j[section][group] || {};
            Object.assign(j[section][group], pairs);
        }
    }
    fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
    console.log(`updated ${lang}.json`);
}
