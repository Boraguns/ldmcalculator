const fs = require('fs');
const path = require('path');

// 3-category stacking model: none / full / self.
// Full descriptions (tooltips / accessible titles).
const full = {
  tr: { title: 'İstifleme türü', none: 'İstiflenemez — üstüne hiçbir yük konulamaz (yalnız zemin)', full: 'İstiflenebilir — başka yüklerin altında veya üstünde taşınabilir (taşıyıcı, kısıt yok)', self: 'Kendi içinde istiflenebilir — yalnız aynı üründen üst üste' },
  en: { title: 'Stacking type', none: 'Not stackable — nothing may be placed on top (floor only)', full: 'Fully stackable — carried under or on top of other loads (carrier, no limit)', self: 'Self-stack only — same product on itself' },
  de: { title: 'Stapelart', none: 'Nicht stapelbar — nichts darf darauf (nur Boden)', full: 'Voll stapelbar — unter oder über anderen Lasten (Träger, ohne Limit)', self: 'Nur Selbststapelung — gleiches Produkt aufeinander' },
  ru: { title: 'Тип штабелирования', none: 'Без штабелирования — сверху ничего нельзя (только пол)', full: 'Полностью штабелируется — под или над другими грузами (основание, без ограничений)', self: 'Только на себя — тот же товар друг на друга' },
  fr: { title: "Type d'empilage", none: 'Non empilable — rien ne peut être posé dessus (sol seul)', full: 'Entièrement empilable — sous ou sur d’autres charges (support, sans limite)', self: 'Empilable sur lui-même — même produit uniquement' },
  ar: { title: 'نوع التكديس', none: 'غير قابل للتكديس — لا يوضع شيء فوقه (الأرضية فقط)', full: 'قابل للتكديس بالكامل — تحت أو فوق أحمال أخرى (قاعدة، بلا قيود)', self: 'يُكدَّس على نفسه فقط — نفس المنتج' },
};

// Short labels (shown inside the select; clear single concept, one row).
const short = {
  tr: { none: 'İstiflenemez', full: 'İstiflenebilir', self: 'Kendi içinde' },
  en: { none: 'No stacking', full: 'Stackable', self: 'Self-stack' },
  de: { none: 'Nicht stapelbar', full: 'Stapelbar', self: 'Selbststapelnd' },
  ru: { none: 'Без штаб.', full: 'Штабелируется', self: 'Сам на себя' },
  fr: { none: 'Non empilable', full: 'Empilable', self: 'Sur lui-même' },
  ar: { none: 'بدون تكديس', full: 'قابل للتكديس', self: 'على نفسه' },
};

for (const lang of Object.keys(full)) {
  const file = path.join(__dirname, '..', 'src', 'i18n', 'locales', `${lang}.json`);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.wizard = j.wizard || {};
  // Rebuild cleanly: 3 categories only.
  j.wizard.stackMode = { ...full[lang], short: short[lang] };
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  console.log(`${lang}: wizard.stackMode rebuilt (none/full/self)`);
}
