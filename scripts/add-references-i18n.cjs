// Adds references page i18n + footer link label, for all 6 locales.
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const T = {
    tr: {
        footerLink: 'Referanslar',
        title: 'Referanslarımız',
        subtitle: 'Bize güvenen firmalar ve iş ortaklarımız.',
        empty: 'Henüz referans eklenmedi.',
        metaTitle: 'Referanslar | LDMCalculator',
        metaDesc: 'LDMCalculator’a güvenen firmalar ve iş ortaklarımız.',
    },
    en: {
        footerLink: 'References',
        title: 'Our References',
        subtitle: 'Companies and partners who trust us.',
        empty: 'No references have been added yet.',
        metaTitle: 'References | LDMCalculator',
        metaDesc: 'Companies and partners who trust LDMCalculator.',
    },
    de: {
        footerLink: 'Referenzen',
        title: 'Unsere Referenzen',
        subtitle: 'Unternehmen und Partner, die uns vertrauen.',
        empty: 'Es wurden noch keine Referenzen hinzugefügt.',
        metaTitle: 'Referenzen | LDMCalculator',
        metaDesc: 'Unternehmen und Partner, die LDMCalculator vertrauen.',
    },
    ru: {
        footerLink: 'Референсы',
        title: 'Наши референсы',
        subtitle: 'Компании и партнёры, которые нам доверяют.',
        empty: 'Референсы ещё не добавлены.',
        metaTitle: 'Референсы | LDMCalculator',
        metaDesc: 'Компании и партнёры, которые доверяют LDMCalculator.',
    },
    fr: {
        footerLink: 'Références',
        title: 'Nos références',
        subtitle: 'Les entreprises et partenaires qui nous font confiance.',
        empty: 'Aucune référence ajoutée pour le moment.',
        metaTitle: 'Références | LDMCalculator',
        metaDesc: 'Les entreprises et partenaires qui font confiance à LDMCalculator.',
    },
    ar: {
        footerLink: 'المراجع',
        title: 'مراجعنا',
        subtitle: 'الشركات والشركاء الذين يثقون بنا.',
        empty: 'لم تتم إضافة أي مراجع بعد.',
        metaTitle: 'المراجع | LDMCalculator',
        metaDesc: 'الشركات والشركاء الذين يثقون بـ LDMCalculator.',
    },
};

for (const [lang, v] of Object.entries(T)) {
    const file = path.join(dir, `${lang}.json`);
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    j.footer = j.footer || {};
    j.footer.references = v.footerLink;
    j.references = {
        title: v.title,
        subtitle: v.subtitle,
        empty: v.empty,
        metaTitle: v.metaTitle,
        metaDesc: v.metaDesc,
    };
    fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
    console.log('updated', lang);
}
