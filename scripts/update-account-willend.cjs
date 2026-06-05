const fs = require('fs');
const path = require('path');

const vals = {
  tr: 'Aboneliğiniz dönem sonunda bitecek.',
  en: 'Your subscription will end at the period end.',
  de: 'Ihr Abonnement endet zum Periodenende.',
  ru: 'Подписка завершится в конце периода.',
  fr: 'Votre abonnement prendra fin à la fin de la période.',
  ar: 'سينتهي اشتراكك في نهاية الفترة.',
};

for (const [lang, text] of Object.entries(vals)) {
  const file = path.join(__dirname, '..', 'src', 'i18n', 'locales', `${lang}.json`);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.account.willCancel = text;
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  console.log(`${lang}: willCancel updated`);
}
