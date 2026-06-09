const fs = require('fs');
const path = require('path');

const vals = {
  tr: {
    maxProducts: 'En fazla 100 farklı ürün ekleyebilirsiniz!',
    frontZone: 'Ön bölge (ilk 4 m)',
    frontZoneWarn: 'Ön bölge yük sınırı (4.5 t) aşıldı — yükü mümkünse arkaya kaydırın veya azaltın.',
  },
  en: {
    maxProducts: 'You can add at most 100 different products!',
    frontZone: 'Front zone (first 4 m)',
    frontZoneWarn: 'Front-zone load limit (4.5 t) exceeded — shift the load rearward or reduce it if possible.',
  },
  de: {
    maxProducts: 'Sie können maximal 100 verschiedene Produkte hinzufügen!',
    frontZone: 'Vorderzone (erste 4 m)',
    frontZoneWarn: 'Lastgrenze der Vorderzone (4,5 t) überschritten — Last nach hinten verlagern oder reduzieren.',
  },
  ru: {
    maxProducts: 'Можно добавить не более 100 разных товаров!',
    frontZone: 'Передняя зона (первые 4 м)',
    frontZoneWarn: 'Превышен лимит нагрузки передней зоны (4,5 т) — сместите груз назад или уменьшите его.',
  },
  fr: {
    maxProducts: 'Vous pouvez ajouter au maximum 100 produits différents !',
    frontZone: 'Zone avant (4 premiers m)',
    frontZoneWarn: "Limite de charge de la zone avant (4,5 t) dépassée — déplacez la charge vers l'arrière ou réduisez-la.",
  },
  ar: {
    maxProducts: '100 منتج كحد أقصى',
    frontZone: 'المنطقة الأمامية (أول 4 م)',
    frontZoneWarn: 'تم تجاوز حد حمولة المنطقة الأمامية (4.5 طن) — انقل الحمولة للخلف أو قلّلها إن أمكن.',
  },
};

for (const [lang, kv] of Object.entries(vals)) {
  const file = path.join(__dirname, '..', 'src', 'i18n', 'locales', `${lang}.json`);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.wizard = j.wizard || {};
  j.wizard.maxProducts = kv.maxProducts;
  j.step3 = j.step3 || {};
  j.step3.frontZone = kv.frontZone;
  j.step3.frontZoneWarn = kv.frontZoneWarn;
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  console.log(`${lang}: maxProducts + step3.frontZone/frontZoneWarn updated`);
}
