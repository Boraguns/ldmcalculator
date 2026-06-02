// Adds the editable document-title default + notes-box i18n keys to invoice.form.* across all locales.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const VALUES = {
    en: { titleDefault: 'INVOICE', notes: 'Notes', notesPlaceholder: 'Notes (optional)' },
    tr: { titleDefault: 'FATURA', notes: 'Notlar', notesPlaceholder: 'Notlar (isteğe bağlı)' },
    de: { titleDefault: 'RECHNUNG', notes: 'Notizen', notesPlaceholder: 'Notizen (optional)' },
    ru: { titleDefault: 'СЧЁТ', notes: 'Примечания', notesPlaceholder: 'Примечания (необязательно)' },
    fr: { titleDefault: 'FACTURE', notes: 'Notes', notesPlaceholder: 'Notes (facultatif)' },
    ar: { titleDefault: 'فاتورة', notes: 'ملاحظات', notesPlaceholder: 'ملاحظات (اختياري)' },
};

for (const [lang, vals] of Object.entries(VALUES)) {
    const file = path.join(dir, `${lang}.json`);
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    j.invoice = j.invoice || {};
    j.invoice.form = j.invoice.form || {};
    Object.assign(j.invoice.form, vals);
    fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
    console.log(`updated ${lang}.json`);
}
