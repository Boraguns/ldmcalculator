const fs = require('fs');
const path = require('path');

const vals = {
  tr: { excelExport: "Listeyi Excel'e aktar", excelExportHint: 'Elle girdiğiniz ürünleri şablon olarak indirin (tekrar yükleyebilirsiniz).' },
  en: { excelExport: 'Export list to Excel', excelExportHint: 'Download your typed-in products as a template (you can re-upload it).' },
  de: { excelExport: 'Liste nach Excel exportieren', excelExportHint: 'Ihre eingegebenen Produkte als Vorlage herunterladen (wieder hochladbar).' },
  ru: { excelExport: 'Экспорт списка в Excel', excelExportHint: 'Скачать введённые товары как шаблон (можно загрузить снова).' },
  fr: { excelExport: 'Exporter la liste vers Excel', excelExportHint: 'Téléchargez vos produits saisis sous forme de modèle (réimportable).' },
  ar: { excelExport: 'تصدير القائمة إلى Excel', excelExportHint: 'نزّل المنتجات المُدخلة كقالب (يمكن رفعه مرة أخرى).' },
};

for (const [lang, kv] of Object.entries(vals)) {
  const file = path.join(__dirname, '..', 'src', 'i18n', 'locales', `${lang}.json`);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.wizard = j.wizard || {};
  j.wizard.excelExport = kv.excelExport;
  j.wizard.excelExportHint = kv.excelExportHint;
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  console.log(`${lang}: wizard.excelExport/excelExportHint updated`);
}
