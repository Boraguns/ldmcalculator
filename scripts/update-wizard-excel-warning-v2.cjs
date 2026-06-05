// Shorten the Excel warning to fit one line, and add a confirm prompt shown
// when the visitor clicks "upload from Excel".
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const DATA = {
    en: { wizard: { excelWarning: 'Use only the template above.', excelConfirm: 'Did you prepare your file from the template above? Only files based on the template will work.' } },
    tr: { wizard: { excelWarning: 'Yalnızca yukarıdaki şablonu kullanın.', excelConfirm: 'Dosyanızı yukarıdaki şablondan mı hazırladınız? Yalnızca şablona dayalı dosyalar çalışır.' } },
    de: { wizard: { excelWarning: 'Nur die obige Vorlage verwenden.', excelConfirm: 'Haben Sie Ihre Datei mit der obigen Vorlage erstellt? Nur auf der Vorlage basierende Dateien funktionieren.' } },
    ru: { wizard: { excelWarning: 'Используйте только шаблон выше.', excelConfirm: 'Вы подготовили файл по шаблону выше? Работают только файлы на основе шаблона.' } },
    fr: { wizard: { excelWarning: 'Utilisez uniquement le modèle ci-dessus.', excelConfirm: 'Avez-vous préparé votre fichier à partir du modèle ci-dessus ? Seuls les fichiers basés sur le modèle fonctionnent.' } },
    ar: { wizard: { excelWarning: 'استخدم القالب أعلاه فقط.', excelConfirm: 'هل أعددت ملفك من القالب أعلاه؟ تعمل الملفات المبنية على القالب فقط.' } },
};

for (const [lang, sections] of Object.entries(DATA)) {
    const file = path.join(dir, `${lang}.json`);
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const [section, pairs] of Object.entries(sections)) {
        j[section] = j[section] || {};
        Object.assign(j[section], pairs);
    }
    fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
    console.log(`updated ${lang}.json`);
}
