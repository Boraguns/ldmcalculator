const fs = require('fs');
const path = require('path');
const L = {
  en: { show: 'Show guide', hide: 'Hide guide' },
  tr: { show: 'Kılavuzu göster', hide: 'Kılavuzu gizle' },
  de: { show: 'Anleitung anzeigen', hide: 'Anleitung ausblenden' },
  ru: { show: 'Показать инструкцию', hide: 'Скрыть инструкцию' },
  fr: { show: 'Afficher le guide', hide: 'Masquer le guide' },
  ar: { show: 'إظهار الدليل', hide: 'إخفاء الدليل' },
};
const dir = path.join(process.cwd(), 'src/i18n/locales');
for (const [lang, v] of Object.entries(L)) {
  const fp = path.join(dir, lang + '.json');
  const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
  if (!j.cmr || !j.cmr.guide) { console.log(lang, 'NO cmr.guide — skipped'); continue; }
  j.cmr.guide.show = v.show;
  j.cmr.guide.hide = v.hide;
  fs.writeFileSync(fp, JSON.stringify(j, null, 2) + '\n', 'utf8');
  console.log(lang, 'ok →', v.show, '/', v.hide);
}
