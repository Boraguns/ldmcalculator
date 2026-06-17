const fs = require('fs');
const path = require('path');

const vals = {
  tr: { title: 'İstifleme türü', none: 'İstiflemeye uygun değil (yalnız zemin)', bear: 'Üzerine yük konulabilir (taşıyıcı)', top: 'Başka yüklerin üzerine konulabilir', both: 'Çift yönlü istiflenebilir' },
  en: { title: 'Stacking type', none: 'Not stackable (floor only)', bear: 'Bears load on top (carrier)', top: 'Goes on top of others', both: 'Both ways' },
  de: { title: 'Stapelart', none: 'Nicht stapelbar (nur Boden)', bear: 'Trägt Last oben (Träger)', top: 'Kommt auf andere', both: 'Beidseitig stapelbar' },
  ru: { title: 'Тип штабелирования', none: 'Без штабелирования (только пол)', bear: 'Несёт груз сверху (основание)', top: 'Ставится на другие', both: 'В обе стороны' },
  fr: { title: "Type d'empilage", none: 'Non empilable (sol seul)', bear: 'Porte une charge (support)', top: 'Se pose sur d’autres', both: 'Bidirectionnel' },
  ar: { title: 'نوع التكديس', none: 'غير قابل للتكديس (الأرضية فقط)', bear: 'يحمل فوقه (قاعدة)', top: 'يوضع فوق غيره', both: 'كلا الاتجاهين' },
};

for (const [lang, kv] of Object.entries(vals)) {
  const file = path.join(__dirname, '..', 'src', 'i18n', 'locales', `${lang}.json`);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.wizard = j.wizard || {};
  j.wizard.stackMode = kv;
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  console.log(`${lang}: wizard.stackMode added`);
}
