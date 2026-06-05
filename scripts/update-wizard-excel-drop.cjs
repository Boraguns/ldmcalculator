const fs = require('fs');
const path = require('path');

const vals = {
  tr: 'Dosyayı buraya sürükleyin veya seçmek için tıklayın',
  en: 'Drag your file here or click to select',
  de: 'Datei hierher ziehen oder zum Auswählen klicken',
  ru: 'Перетащите файл сюда или нажмите, чтобы выбрать',
  fr: 'Glissez votre fichier ici ou cliquez pour le sélectionner',
  ar: 'اسحب ملفك هنا أو انقر للاختيار',
};

for (const [lang, text] of Object.entries(vals)) {
  const file = path.join(__dirname, '..', 'src', 'i18n', 'locales', `${lang}.json`);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.wizard.excelDrop = text;
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  console.log(`${lang}: excelDrop set`);
}
