const fs = require('fs');
const path = require('path');

const vals = {
  tr: { quickSubscribe: 'Hızlı abone ol', viewAllPlans: 'Tüm planları gör' },
  en: { quickSubscribe: 'Quick subscribe', viewAllPlans: 'View all plans' },
  de: { quickSubscribe: 'Schnell abonnieren', viewAllPlans: 'Alle Pläne ansehen' },
  ru: { quickSubscribe: 'Быстрая подписка', viewAllPlans: 'Все тарифы' },
  fr: { quickSubscribe: 'Abonnement rapide', viewAllPlans: 'Voir tous les forfaits' },
  ar: { quickSubscribe: 'اشترك بسرعة', viewAllPlans: 'عرض كل الباقات' },
};

for (const [lang, kv] of Object.entries(vals)) {
  const file = path.join(__dirname, '..', 'src', 'i18n', 'locales', `${lang}.json`);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.account.quickSubscribe = kv.quickSubscribe;
  j.account.viewAllPlans = kv.viewAllPlans;
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  console.log(`${lang}: quickSubscribe + viewAllPlans updated`);
}
