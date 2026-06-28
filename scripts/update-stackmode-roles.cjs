const fs = require('fs');
const path = require('path');

// Full descriptions (tooltips) and short labels (shown inside the select) for
// the two new stacking modes: carrier and topper.
const full = {
  tr: { carrier: 'Taşıyıcı — önce alta yerleştirilir (taban) ve üzerine başka ürünler istiflenir', topper: 'Başka ürünün üstüne istiflenir — önce zemine, taşan kısmı taşıyıcıların üstüne konur; üstüne yük konmaz' },
  en: { carrier: 'Carrier — placed at the bottom first (base) with other products stacked on top', topper: 'Stacks onto other products — floor first, overflow rides on carriers; nothing on top of it' },
  de: { carrier: 'Träger — zuerst unten (Basis), andere Produkte werden darauf gestapelt', topper: 'Wird auf andere gestapelt — zuerst Boden, Überschuss auf Trägern; nichts darauf' },
  ru: { carrier: 'Основание — ставится вниз первым (база), сверху штабелируются другие товары', topper: 'Ставится на другие товары — сначала пол, излишек на основаниях; сверху ничего' },
  fr: { carrier: 'Support — placé en bas en priorité (base), les autres produits sont empilés dessus', topper: 'Se pose sur d’autres produits — sol d’abord, surplus sur supports ; rien dessus' },
  ar: { carrier: 'قاعدة — يُوضع في الأسفل أولاً وتُكدَّس المنتجات الأخرى فوقه', topper: 'يُكدَّس فوق منتجات أخرى — الأرضية أولاً والفائض على القواعد؛ لا شيء فوقه' },
};
const short = {
  tr: { carrier: 'Taşıyıcı', topper: 'Başka Ürünün Üstüne İstiflenir' },
  en: { carrier: 'Carrier', topper: 'Stacks on other products' },
  de: { carrier: 'Träger', topper: 'Auf andere stapeln' },
  ru: { carrier: 'Основание', topper: 'На другие товары' },
  fr: { carrier: 'Support', topper: 'Sur d’autres produits' },
  ar: { carrier: 'قاعدة', topper: 'فوق منتجات أخرى' },
};

for (const lang of Object.keys(full)) {
  const file = path.join(__dirname, '..', 'src', 'i18n', 'locales', `${lang}.json`);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.wizard = j.wizard || {};
  j.wizard.stackMode = j.wizard.stackMode || {};
  j.wizard.stackMode.carrier = full[lang].carrier;
  j.wizard.stackMode.topper = full[lang].topper;
  j.wizard.stackMode.short = j.wizard.stackMode.short || {};
  j.wizard.stackMode.short.carrier = short[lang].carrier;
  j.wizard.stackMode.short.topper = short[lang].topper;
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  console.log(`${lang}: stackMode.carrier/topper (+short) added`);
}
