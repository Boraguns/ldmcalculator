// Rename the first goods-table column from a sequence number ("Item No") to a
// product code ("Ürün Kodu") on both the invoice and packing-list pages.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const LABEL = {
    en: 'Product Code',
    tr: 'Ürün Kodu',
    de: 'Produktcode',
    ru: 'Код товара',
    fr: 'Code produit',
    ar: 'رمز المنتج',
};

for (const [lang, label] of Object.entries(LABEL)) {
    const file = path.join(dir, `${lang}.json`);
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (j.invoice?.table) j.invoice.table.itemNo = label;
    if (j.packing?.table) j.packing.table.itemNo = label;
    fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
    console.log(`updated ${lang}.json -> ${label}`);
}
