// Rename the tools dropdown label from "Tools" to "Documents" (tr "Belgeler"),
// since the menu only lists document templates (CMR, Invoice, Packing List).
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const LABEL = {
    en: 'Documents',
    tr: 'Belgeler',
    de: 'Dokumente',
    ru: 'Документы',
    fr: 'Documents',
    ar: 'المستندات',
};

for (const [lang, label] of Object.entries(LABEL)) {
    const file = path.join(dir, `${lang}.json`);
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    j.tools = j.tools || {};
    j.tools.label = label;
    fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
    console.log(`updated ${lang}.json -> ${label}`);
}
