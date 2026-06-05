// Add an "important" badge + warning to the Excel bulk-upload box: users must
// use the provided template; their own spreadsheet won't be parsed directly.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const DATA = {
    en: { wizard: { important: 'IMPORTANT', excelWarning: 'You must fill in and upload the template above. Your own Excel file will not work directly.' } },
    tr: { wizard: { important: 'ÖNEMLİ', excelWarning: 'Yukarıdaki şablonu doldurup yüklemelisiniz. Kendi Excel dosyanız doğrudan çalışmayacaktır.' } },
    de: { wizard: { important: 'WICHTIG', excelWarning: 'Sie müssen die obige Vorlage ausfüllen und hochladen. Ihre eigene Excel-Datei funktioniert nicht direkt.' } },
    ru: { wizard: { important: 'ВАЖНО', excelWarning: 'Необходимо заполнить и загрузить шаблон выше. Ваш собственный файл Excel не будет работать напрямую.' } },
    fr: { wizard: { important: 'IMPORTANT', excelWarning: 'Vous devez remplir et téléverser le modèle ci-dessus. Votre propre fichier Excel ne fonctionnera pas directement.' } },
    ar: { wizard: { important: 'هام', excelWarning: 'يجب تعبئة القالب أعلاه ورفعه. لن يعمل ملف Excel الخاص بك مباشرةً.' } },
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
