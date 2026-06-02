// Simplify the document menu/detail labels (CMR / Fatura / Çeki Listesi)
// and add per-language invoice goods-table headers (was hardcoded Russian).
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const T = {
    tr: {
        cmr: 'CMR', invoice: 'Fatura', packingList: 'Çeki Listesi',
        table: { hs: 'GTİP', name: 'Malın Cinsi', qty: 'Adet', price: 'Birim Fiyat (EUR)', total: 'Toplam (EUR)' },
    },
    en: {
        cmr: 'CMR', invoice: 'Invoice', packingList: 'Packing List',
        table: { hs: 'HS Code', name: 'Description of Goods', qty: 'Qty', price: 'Unit Price (EUR)', total: 'Total (EUR)' },
    },
    de: {
        cmr: 'CMR', invoice: 'Rechnung', packingList: 'Packliste',
        table: { hs: 'HS-Code', name: 'Warenbezeichnung', qty: 'Menge', price: 'Preis (EUR)', total: 'Summe (EUR)' },
    },
    ru: {
        cmr: 'CMR', invoice: 'Инвойс', packingList: 'Упаковочный лист',
        table: { hs: 'ТН ВЭД', name: 'Наименование товара', qty: 'Кол-во', price: 'Цена (EUR)', total: 'Итого (EUR)' },
    },
    fr: {
        cmr: 'CMR', invoice: 'Facture', packingList: 'Liste de colisage',
        table: { hs: 'Code SH', name: 'Désignation des marchandises', qty: 'Qté', price: 'Prix (EUR)', total: 'Total (EUR)' },
    },
    ar: {
        cmr: 'CMR', invoice: 'فاتورة', packingList: 'قائمة التعبئة',
        table: { hs: 'رمز HS', name: 'وصف البضاعة', qty: 'الكمية', price: 'السعر (EUR)', total: 'الإجمالي (EUR)' },
    },
};

for (const [lang, v] of Object.entries(T)) {
    const file = path.join(dir, `${lang}.json`);
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    j.tools = j.tools || {};
    j.tools.cmr = v.cmr;
    j.tools.invoice = v.invoice;
    j.tools.packingList = v.packingList;
    j.invoice = j.invoice || {};
    j.invoice.table = v.table;
    fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
    console.log('updated', lang);
}
