const fs = require('fs');
const path = require('path');

// Full descriptions (used in tooltips / accessible titles)
const full = {
  tr: { title: 'İstifleme türü', none: 'İstiflenemez (yalnız zemin)', bear: 'Taşıyıcı — üstüne başka yük konur', top: 'Üste konan — kendi üstüne yük taşımaz', self: 'Kendi içinde istiflenir (aynı üründen üst üste)' },
  en: { title: 'Stacking type', none: 'Not stackable (floor only)', bear: 'Carrier — bears other loads on top', top: 'Goes on top — bears nothing', self: 'Self-stacks (same product on itself)' },
  de: { title: 'Stapelart', none: 'Nicht stapelbar (nur Boden)', bear: 'Träger — trägt andere Lasten oben', top: 'Kommt oben drauf — trägt nichts', self: 'Selbststapelnd (gleiches Produkt)' },
  ru: { title: 'Тип штабелирования', none: 'Без штабелирования (только пол)', bear: 'Основание — несёт другие грузы сверху', top: 'Ставится сверху — ничего не несёт', self: 'Сам на себя (тот же товар)' },
  fr: { title: "Type d'empilage", none: 'Non empilable (sol seul)', bear: 'Support — porte d’autres charges', top: 'Se pose dessus — ne porte rien', self: 'Empilable sur lui-même (même produit)' },
  ar: { title: 'نوع التكديس', none: 'غير قابل للتكديس (الأرضية فقط)', bear: 'قاعدة — يحمل أحمالاً فوقه', top: 'يوضع فوق غيره — لا يحمل شيئاً', self: 'يُكدَّس على نفسه (نفس المنتج)' },
};

// Short labels (shown inside the select; clear single concept, fits one row)
const short = {
  tr: { none: 'İstiflenemez', bear: 'Taşıyıcı (alta)', top: 'Üste konan', self: 'Kendi içinde' },
  en: { none: 'No stacking', bear: 'Carrier (base)', top: 'On top', self: 'Self-stack' },
  de: { none: 'Nicht stapelbar', bear: 'Träger (Basis)', top: 'Oben drauf', self: 'Selbststapelnd' },
  ru: { none: 'Без штаб.', bear: 'Основание', top: 'Сверху', self: 'Сам на себя' },
  fr: { none: 'Non empilable', bear: 'Support (base)', top: 'Au-dessus', self: 'Sur lui-même' },
  ar: { none: 'بدون تكديس', bear: 'قاعدة', top: 'بالأعلى', self: 'على نفسه' },
};

for (const lang of Object.keys(full)) {
  const file = path.join(__dirname, '..', 'src', 'i18n', 'locales', `${lang}.json`);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.wizard = j.wizard || {};
  // Rebuild stackMode cleanly: drop the old 'both', set full + short.
  j.wizard.stackMode = { ...full[lang], short: short[lang] };
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  console.log(`${lang}: wizard.stackMode rebuilt (none/bear/top/self)`);
}
