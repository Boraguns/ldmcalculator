const fs = require('fs');
const path = require('path');
const L = {
  en: 'Pricing',
  tr: 'Fiyatlandırma',
  de: 'Preise',
  ru: 'Цены',
  fr: 'Tarifs',
  ar: 'الأسعار',
};
const dir = path.join(process.cwd(), 'src/i18n/locales');
for (const [lang, label] of Object.entries(L)) {
  const fp = path.join(dir, lang + '.json');
  const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
  if (!j.footer) { console.log(lang, 'NO footer — skipped'); continue; }
  j.footer.pricing = label;
  fs.writeFileSync(fp, JSON.stringify(j, null, 2) + '\n', 'utf8');
  console.log(lang, 'footer.pricing =', label);
}
