const fs = require('fs');
const path = require('path');

const vals = {
  tr: { frontZone: 'Ön 4m (max 4.5 t)', frontZoneWarn: 'Ön 4 metre 4,5 ton sınırını aşıyor — daha hafif ürünleri öne alın veya yükü azaltın.' },
  en: { frontZone: 'Front 4 m (max 4.5 t)', frontZoneWarn: 'The front 4 m exceeds the 4.5 t limit — move lighter products to the front or reduce the load.' },
  de: { frontZone: 'Vordere 4 m (max. 4,5 t)', frontZoneWarn: 'Die vorderen 4 m überschreiten das 4,5-t-Limit — leichtere Produkte nach vorne oder Last reduzieren.' },
  ru: { frontZone: 'Перед. 4 м (макс. 4,5 т)', frontZoneWarn: 'Передние 4 м превышают лимит 4,5 т — переместите более лёгкие товары вперёд или уменьшите груз.' },
  fr: { frontZone: '4 m avant (max 4,5 t)', frontZoneWarn: "Les 4 m avant dépassent la limite de 4,5 t — placez des produits plus légers à l'avant ou réduisez la charge." },
  ar: { frontZone: 'أول 4 م (حد 4.5 طن)', frontZoneWarn: 'تتجاوز الأمتار الأربعة الأمامية حد 4.5 طن — ضع منتجات أخف في الأمام أو قلّل الحمولة.' },
};

for (const [lang, kv] of Object.entries(vals)) {
  const file = path.join(__dirname, '..', 'src', 'i18n', 'locales', `${lang}.json`);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.step3 = j.step3 || {};
  j.step3.frontZone = kv.frontZone;
  j.step3.frontZoneWarn = kv.frontZoneWarn;
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  console.log(`${lang}: step3.frontZone/frontZoneWarn updated`);
}
