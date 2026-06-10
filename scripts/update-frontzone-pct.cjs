const fs = require('fs');
const path = require('path');

const vals = {
  tr: {
    frontZone: 'Ön 4m (hedef ~%20)',
    frontZoneWarn: "Ön 4 metre, hedeflenen ~%20'nin üzerinde yük taşıyor. Dengelemek için aks dengele'yi kullanın.",
  },
  en: {
    frontZone: 'Front 4 m (target ~20%)',
    frontZoneWarn: 'The front 4 m is carrying more than the ~20% target. Use Rebalance to even it out.',
  },
  de: {
    frontZone: 'Vordere 4 m (Ziel ~20%)',
    frontZoneWarn: 'Die vorderen 4 m tragen mehr als die ~20%-Zielmarke. Mit „Ausbalancieren“ ausgleichen.',
  },
  ru: {
    frontZone: 'Перед. 4 м (цель ~20%)',
    frontZoneWarn: 'Передние 4 м несут больше целевых ~20%. Используйте «Балансировать», чтобы выровнять.',
  },
  fr: {
    frontZone: '4 m avant (cible ~20%)',
    frontZoneWarn: 'Les 4 m avant portent plus que la cible ~20%. Utilisez « Rééquilibrer » pour égaliser.',
  },
  ar: {
    frontZone: 'أول 4 م (الهدف ~20%)',
    frontZoneWarn: 'تحمل الأمتار الأربعة الأمامية أكثر من هدف ~20%. استخدم «إعادة التوازن» للموازنة.',
  },
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
