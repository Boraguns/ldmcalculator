const fs = require('fs');
const path = require('path');

const vals = {
  tr: { carrier: 'Taşıyıcı', carrierTitle: 'Bu ürün taşıyıcı olsun: önce alta yerleştirilir (taban önceliği) ve üzerine başka ürünler istiflenir. İşaretlenmezse mevcut hesaplama korunur.', goesOnTop: 'Üste de konur', goesOnTopTitle: 'Bu ürün başka ürünlerin üstüne de konabilir: önce zemine yayılır, taşan kısmı taşıyıcıların üstüne istiflenir.' },
  en: { carrier: 'Carrier', carrierTitle: 'Make this a carrier: placed at the bottom first (base priority) with other products stacked on top. If left off, the standard calculation is kept.', goesOnTop: 'Goes on top', goesOnTopTitle: 'This product may also sit on top of others: spread on the floor first, its overflow caps carriers.' },
  de: { carrier: 'Träger', carrierTitle: 'Als Träger festlegen: zuerst unten platziert (Basis-Priorität), andere Produkte werden darauf gestapelt. Aus = Standardberechnung.', goesOnTop: 'Kommt oben drauf', goesOnTopTitle: 'Dieses Produkt darf auch auf andere gestapelt werden: zuerst auf den Boden, Überschuss deckt Träger ab.' },
  ru: { carrier: 'Основание', carrierTitle: 'Сделать основанием: ставится вниз первым (приоритет базы), сверху штабелируются другие товары. Выкл — стандартный расчёт.', goesOnTop: 'Можно сверху', goesOnTopTitle: 'Этот товар можно ставить и на другие: сначала на пол, излишек накрывает основания.' },
  fr: { carrier: 'Support', carrierTitle: 'Définir comme support : placé en bas en priorité, les autres produits sont empilés dessus. Désactivé = calcul standard.', goesOnTop: 'Se pose dessus', goesOnTopTitle: 'Ce produit peut aussi se poser sur d’autres : d’abord au sol, son surplus coiffe les supports.' },
  ar: { carrier: 'قاعدة', carrierTitle: 'اجعله قاعدة: يُوضع في الأسفل أولاً (أولوية القاعدة) وتُكدَّس المنتجات الأخرى فوقه. عند الإيقاف يُحفظ الحساب الافتراضي.', goesOnTop: 'يوضع فوق', goesOnTopTitle: 'يمكن وضع هذا المنتج فوق غيره أيضاً: يُفرش على الأرضية أولاً ويُغطّي فائضُه القواعد.' },
};

for (const [lang, kv] of Object.entries(vals)) {
  const file = path.join(__dirname, '..', 'src', 'i18n', 'locales', `${lang}.json`);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.wizard = j.wizard || {};
  Object.assign(j.wizard, kv);
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  console.log(`${lang}: wizard.carrier/goesOnTop (+titles) added`);
}
