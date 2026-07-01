const fs = require('fs');
const path = require('path');

const vals = {
  tr: { isolateHint: 'Bu ürünün istifteki yerini göster (diğerlerini gizle)', showAll: 'Tümünü göster' },
  en: { isolateHint: 'Show where this product sits in the load (hide others)', showAll: 'Show all' },
  de: { isolateHint: 'Position dieses Produkts zeigen (andere ausblenden)', showAll: 'Alle anzeigen' },
  ru: { isolateHint: 'Показать место этого товара (скрыть остальные)', showAll: 'Показать все' },
  fr: { isolateHint: 'Voir où se trouve ce produit (masquer les autres)', showAll: 'Tout afficher' },
  ar: { isolateHint: 'إظهار موضع هذا المنتج (إخفاء الباقي)', showAll: 'إظهار الكل' },
};

for (const [lang, kv] of Object.entries(vals)) {
  const file = path.join(__dirname, '..', 'src', 'i18n', 'locales', `${lang}.json`);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.viewer = j.viewer || {};
  j.viewer.isolateHint = kv.isolateHint;
  j.viewer.showAll = kv.showAll;
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  console.log(`${lang}: viewer.isolateHint/showAll added`);
}
