const fs = require('fs');
const path = require('path');

const shorts = {
  tr: { both: 'İstif: Çift yönlü', bear: 'İstif: Taşıyıcı', top: 'İstif: Üste konur', none: 'İstif: Tek başına' },
  en: { both: 'Stack: Both ways', bear: 'Stack: Carrier', top: 'Stack: On top', none: 'Stack: Floor only' },
  de: { both: 'Stapeln: Beidseitig', bear: 'Stapeln: Träger', top: 'Stapeln: Oben drauf', none: 'Stapeln: Nur Boden' },
  ru: { both: 'Штаб.: В обе стороны', bear: 'Штаб.: Основание', top: 'Штаб.: Сверху', none: 'Штаб.: Только пол' },
  fr: { both: 'Empil.: Bidirectionnel', bear: 'Empil.: Support', top: 'Empil.: Au-dessus', none: 'Empil.: Sol seul' },
  ar: { both: 'تكديس: كلا الاتجاهين', bear: 'تكديس: قاعدة', top: 'تكديس: بالأعلى', none: 'تكديس: الأرضية فقط' },
};

for (const [lang, kv] of Object.entries(shorts)) {
  const file = path.join(__dirname, '..', 'src', 'i18n', 'locales', `${lang}.json`);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.wizard = j.wizard || {};
  j.wizard.stackMode = j.wizard.stackMode || {};
  j.wizard.stackMode.short = kv;
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  console.log(`${lang}: wizard.stackMode.short added`);
}
