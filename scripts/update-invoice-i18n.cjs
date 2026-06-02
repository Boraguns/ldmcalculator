// Invoice currency/repeater/auto-totals i18n.
//  - table.price/total: drop the hardcoded "(EUR)" (symbol is now appended in code)
//  - form.currency / addRow / removeRow: new UI strings
//  - relabel totals for the auto-calc model (subtotal / taxable base / VAT rate /
//    VAT amount / grand total)
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const T = {
    tr: {
        price: 'Birim Fiyat', total: 'Toplam',
        currency: 'Para birimi', addRow: 'Satır ekle', removeRow: 'Satırı sil',
        totalGoods: 'Ara toplam', taxable: 'Matrah', vat: 'KDV oranı (%)',
        vatIncl: 'KDV tutarı', totalAmount: 'Genel toplam',
    },
    en: {
        price: 'Unit Price', total: 'Total',
        currency: 'Currency', addRow: 'Add row', removeRow: 'Remove row',
        totalGoods: 'Subtotal', taxable: 'Taxable base', vat: 'VAT rate (%)',
        vatIncl: 'VAT amount', totalAmount: 'Grand total',
    },
    de: {
        price: 'Einzelpreis', total: 'Summe',
        currency: 'Währung', addRow: 'Zeile hinzufügen', removeRow: 'Zeile entfernen',
        totalGoods: 'Zwischensumme', taxable: 'Steuerbasis', vat: 'MwSt.-Satz (%)',
        vatIncl: 'MwSt.-Betrag', totalAmount: 'Gesamtsumme',
    },
    ru: {
        price: 'Цена', total: 'Итого',
        currency: 'Валюта', addRow: 'Добавить строку', removeRow: 'Удалить строку',
        totalGoods: 'Промежуточный итог', taxable: 'Налоговая база', vat: 'Ставка НДС (%)',
        vatIncl: 'Сумма НДС', totalAmount: 'Итого к оплате',
    },
    fr: {
        price: 'Prix unitaire', total: 'Total',
        currency: 'Devise', addRow: 'Ajouter une ligne', removeRow: 'Supprimer la ligne',
        totalGoods: 'Sous-total', taxable: 'Base imposable', vat: 'Taux de TVA (%)',
        vatIncl: 'Montant TVA', totalAmount: 'Total général',
    },
    ar: {
        price: 'السعر', total: 'الإجمالي',
        currency: 'العملة', addRow: 'إضافة صف', removeRow: 'حذف الصف',
        totalGoods: 'المجموع الفرعي', taxable: 'الوعاء الضريبي', vat: 'نسبة الضريبة (%)',
        vatIncl: 'مبلغ الضريبة', totalAmount: 'المجموع الكلي',
    },
};

for (const [lang, v] of Object.entries(T)) {
    const file = path.join(dir, `${lang}.json`);
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    j.invoice = j.invoice || {};
    j.invoice.table = j.invoice.table || {};
    j.invoice.table.price = v.price;
    j.invoice.table.total = v.total;
    j.invoice.form = j.invoice.form || {};
    j.invoice.form.currency = v.currency;
    j.invoice.form.addRow = v.addRow;
    j.invoice.form.removeRow = v.removeRow;
    j.invoice.form.totalGoods = v.totalGoods;
    j.invoice.form.taxable = v.taxable;
    j.invoice.form.vat = v.vat;
    j.invoice.form.vatIncl = v.vatIncl;
    j.invoice.form.totalAmount = v.totalAmount;
    fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
    console.log('updated', lang);
}
