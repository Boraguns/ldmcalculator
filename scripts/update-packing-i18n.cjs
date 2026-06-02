// Invoice table tweaks (HS Code / Mal Cinsi, new Item No column) + the full
// "packing" (Çeki Listesi) namespace, written to all six locales.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

// invoice.table.hs/name only need fixing in Turkish; itemNo is new everywhere.
const INVOICE_TABLE = {
    en: { itemNo: 'Item No' },
    tr: { hs: 'HS Code', name: 'Mal Cinsi', itemNo: 'Sıra No' },
    de: { itemNo: 'Pos.-Nr.' },
    ru: { itemNo: '№' },
    fr: { itemNo: "N° d'article" },
    ar: { itemNo: 'رقم البند' },
};

const PACKING = {
    en: {
        metaTitle: 'Packing List — Fillable Export Packing List Template | LDMCalculator',
        metaDesc: 'Free fillable export packing list template with HS codes, net and gross weights. Upload your stamp, sign by hand, then print or save as PDF.',
        table: { itemNo: 'Item No', hs: 'HS Code', name: 'Description of Goods', qty: 'Qty', netKg: 'Net (kg)', grossKg: 'Gross (kg)' },
        form: {
            titleDefault: 'PACKING LIST',
            plNo: 'Packing list number', invNo: 'Invoice number', invDate: 'Invoice date', issueDate: 'Issue date',
            totalPallets: 'Total pallet(s)', totalUnits: 'Total units', totalNet: 'Total net weight (kg)', totalGross: 'Total gross weight (kg)',
        },
        guide: {
            title: 'How to fill the packing list',
            intro: 'Enter the parties, upload your stamp and sign, fill in the items with their weights, then print.',
            steps: {
                s1: { n: '1', title: 'Parties', desc: 'Enter the sender and recipient details in their boxes.' },
                s2: { n: '2', title: 'Stamp & signature', desc: 'Upload your stamp and sign the box with a mouse or touch.' },
                s3: { n: '3', title: 'Document details', desc: 'Enter the packing list number, invoice number and dates.' },
                s4: { n: '4', title: 'Items & totals', desc: 'Add each item with HS code, description, qty, net and gross weight; the totals add up automatically.' },
            },
            tip: 'Tip: Use the zoom buttons to enlarge the form and click any field to type. “Print / PDF” produces a clean A4 page.',
            show: 'Show guide', hide: 'Hide guide',
        },
    },
    tr: {
        metaTitle: 'Çeki Listesi — Doldurulabilir İhracat Çeki Listesi Şablonu | LDMCalculator',
        metaDesc: 'HS kodları, net ve brüt ağırlıklarla ücretsiz doldurulabilir ihracat çeki listesi şablonu. Kaşenizi yükleyin, elle imzalayın, yazdırın veya PDF kaydedin.',
        table: { itemNo: 'Sıra No', hs: 'HS Code', name: 'Mal Cinsi', qty: 'Adet', netKg: 'Net KG', grossKg: 'Brüt KG' },
        form: {
            titleDefault: 'ÇEKİ LİSTESİ',
            plNo: 'Çeki listesi numarası', invNo: 'Fatura numarası', invDate: 'Fatura tarihi', issueDate: 'Düzenlenme tarihi',
            totalPallets: 'Toplam palet', totalUnits: 'Toplam adet', totalNet: 'Toplam net ağırlık (kg)', totalGross: 'Toplam brüt ağırlık (kg)',
        },
        guide: {
            title: 'Çeki listesi nasıl doldurulur',
            intro: 'Taraf bilgilerini girin, kaşenizi yükleyip imzalayın, kalemleri ağırlıklarıyla doldurun ve yazdırın.',
            steps: {
                s1: { n: '1', title: 'Taraflar', desc: 'Gönderici ve alıcı bilgilerini ilgili kutulara yazın.' },
                s2: { n: '2', title: 'Kaşe ve imza', desc: 'Kaşenizi yükleyin; imza alanını fare veya dokunmatik ile imzalayın.' },
                s3: { n: '3', title: 'Belge bilgileri', desc: 'Çeki listesi numarası, fatura numarası ve tarihleri girin.' },
                s4: { n: '4', title: 'Kalemler ve toplamlar', desc: 'Her kaleme HS kodu, mal cinsi, adet, net ve brüt ağırlık yazın; toplamlar otomatik hesaplanır.' },
            },
            tip: 'İpucu: Yakınlaştırma düğmeleriyle formu büyütüp herhangi bir alana tıklayarak yazabilirsiniz. “Yazdır / PDF” temiz bir A4 sayfası üretir.',
            show: 'Kılavuzu göster', hide: 'Kılavuzu gizle',
        },
    },
    de: {
        metaTitle: 'Packliste — Ausfüllbare Export-Packlisten-Vorlage | LDMCalculator',
        metaDesc: 'Kostenlose ausfüllbare Export-Packlisten-Vorlage mit HS-Codes, Netto- und Bruttogewicht. Stempel hochladen, von Hand unterschreiben, dann drucken oder als PDF speichern.',
        table: { itemNo: 'Pos.-Nr.', hs: 'HS-Code', name: 'Warenbezeichnung', qty: 'Menge', netKg: 'Netto (kg)', grossKg: 'Brutto (kg)' },
        form: {
            titleDefault: 'PACKLISTE',
            plNo: 'Packlisten-Nummer', invNo: 'Rechnungsnummer', invDate: 'Rechnungsdatum', issueDate: 'Ausstellungsdatum',
            totalPallets: 'Paletten gesamt', totalUnits: 'Einheiten gesamt', totalNet: 'Nettogewicht gesamt (kg)', totalGross: 'Bruttogewicht gesamt (kg)',
        },
        guide: {
            title: 'So füllen Sie die Packliste aus',
            intro: 'Geben Sie die Parteien ein, laden Sie Ihren Stempel hoch und unterschreiben Sie, füllen Sie die Positionen mit Gewichten aus und drucken Sie.',
            steps: {
                s1: { n: '1', title: 'Parteien', desc: 'Geben Sie Absender- und Empfängerdaten in die Felder ein.' },
                s2: { n: '2', title: 'Stempel & Unterschrift', desc: 'Laden Sie Ihren Stempel hoch und unterschreiben Sie mit Maus oder Touch.' },
                s3: { n: '3', title: 'Belegdaten', desc: 'Geben Sie Packlistennummer, Rechnungsnummer und Daten ein.' },
                s4: { n: '4', title: 'Positionen & Summen', desc: 'Fügen Sie je Position HS-Code, Bezeichnung, Menge, Netto- und Bruttogewicht hinzu; die Summen werden automatisch berechnet.' },
            },
            tip: 'Tipp: Mit den Zoom-Tasten vergrößern Sie das Formular und können in jedes Feld tippen. „Drucken / PDF“ erzeugt eine saubere A4-Seite.',
            show: 'Anleitung anzeigen', hide: 'Anleitung ausblenden',
        },
    },
    ru: {
        metaTitle: 'Упаковочный лист — Заполняемый шаблон упаковочного листа | LDMCalculator',
        metaDesc: 'Бесплатный заполняемый шаблон экспортного упаковочного листа с кодами ТН ВЭД, весом нетто и брутто. Загрузите печать, подпишите вручную, затем распечатайте или сохраните в PDF.',
        table: { itemNo: '№', hs: 'ТН ВЭД', name: 'Наименование товара', qty: 'Кол-во', netKg: 'Нетто (кг)', grossKg: 'Брутто (кг)' },
        form: {
            titleDefault: 'УПАКОВОЧНЫЙ ЛИСТ',
            plNo: 'Номер упаковочного листа', invNo: 'Номер счёта', invDate: 'Дата счёта', issueDate: 'Дата выдачи',
            totalPallets: 'Всего паллет', totalUnits: 'Всего единиц', totalNet: 'Общий вес нетто (кг)', totalGross: 'Общий вес брутто (кг)',
        },
        guide: {
            title: 'Как заполнить упаковочный лист',
            intro: 'Укажите стороны, загрузите печать и подпишите, заполните позиции с весами и распечатайте.',
            steps: {
                s1: { n: '1', title: 'Стороны', desc: 'Введите данные отправителя и получателя в соответствующие поля.' },
                s2: { n: '2', title: 'Печать и подпись', desc: 'Загрузите печать и подпишите поле мышью или касанием.' },
                s3: { n: '3', title: 'Данные документа', desc: 'Укажите номер упаковочного листа, номер счёта и даты.' },
                s4: { n: '4', title: 'Позиции и итоги', desc: 'Добавьте по позиции код ТН ВЭД, наименование, количество, вес нетто и брутто; итоги считаются автоматически.' },
            },
            tip: 'Совет: Используйте кнопки масштаба, чтобы увеличить форму и щёлкнуть по любому полю. «Печать / PDF» создаёт чистую страницу A4.',
            show: 'Показать руководство', hide: 'Скрыть руководство',
        },
    },
    fr: {
        metaTitle: 'Liste de colisage — Modèle de liste de colisage à remplir | LDMCalculator',
        metaDesc: "Modèle gratuit de liste de colisage d'export à remplir avec codes SH, poids net et brut. Téléchargez votre cachet, signez à la main, puis imprimez ou enregistrez en PDF.",
        table: { itemNo: "N° d'article", hs: 'Code SH', name: 'Désignation des marchandises', qty: 'Qté', netKg: 'Net (kg)', grossKg: 'Brut (kg)' },
        form: {
            titleDefault: 'LISTE DE COLISAGE',
            plNo: 'N° de liste de colisage', invNo: 'N° de facture', invDate: 'Date de facture', issueDate: "Date d'émission",
            totalPallets: 'Total palette(s)', totalUnits: 'Total unités', totalNet: 'Poids net total (kg)', totalGross: 'Poids brut total (kg)',
        },
        guide: {
            title: 'Comment remplir la liste de colisage',
            intro: 'Saisissez les parties, téléchargez votre cachet et signez, remplissez les articles avec leurs poids, puis imprimez.',
            steps: {
                s1: { n: '1', title: 'Parties', desc: "Saisissez les coordonnées de l'expéditeur et du destinataire dans les cases." },
                s2: { n: '2', title: 'Cachet et signature', desc: 'Téléchargez votre cachet et signez la case avec la souris ou le tactile.' },
                s3: { n: '3', title: 'Détails du document', desc: 'Saisissez le n° de liste de colisage, le n° de facture et les dates.' },
                s4: { n: '4', title: 'Articles et totaux', desc: 'Ajoutez par article le code SH, la désignation, la qté, le poids net et brut ; les totaux se calculent automatiquement.' },
            },
            tip: 'Astuce : utilisez les boutons de zoom pour agrandir le formulaire et cliquez sur un champ pour saisir. « Imprimer / PDF » produit une page A4 propre.',
            show: 'Afficher le guide', hide: 'Masquer le guide',
        },
    },
    ar: {
        metaTitle: 'قائمة التعبئة — قالب قائمة تعبئة تصدير قابل للتعبئة | LDMCalculator',
        metaDesc: 'قالب مجاني قابل للتعبئة لقائمة تعبئة التصدير مع رموز HS والوزن الصافي والإجمالي. حمّل ختمك، ووقّع يدويًا، ثم اطبع أو احفظ بصيغة PDF.',
        table: { itemNo: 'رقم البند', hs: 'رمز HS', name: 'وصف البضاعة', qty: 'الكمية', netKg: 'الصافي (كجم)', grossKg: 'الإجمالي (كجم)' },
        form: {
            titleDefault: 'قائمة التعبئة',
            plNo: 'رقم قائمة التعبئة', invNo: 'رقم الفاتورة', invDate: 'تاريخ الفاتورة', issueDate: 'تاريخ الإصدار',
            totalPallets: 'إجمالي المنصات', totalUnits: 'إجمالي الوحدات', totalNet: 'إجمالي الوزن الصافي (كجم)', totalGross: 'إجمالي الوزن الإجمالي (كجم)',
        },
        guide: {
            title: 'كيفية ملء قائمة التعبئة',
            intro: 'أدخل الأطراف، وحمّل ختمك ووقّع، واملأ البنود بأوزانها، ثم اطبع.',
            steps: {
                s1: { n: '1', title: 'الأطراف', desc: 'أدخل بيانات المرسل والمستلم في الحقول المخصصة.' },
                s2: { n: '2', title: 'الختم والتوقيع', desc: 'حمّل ختمك ووقّع في الحقل بالفأرة أو اللمس.' },
                s3: { n: '3', title: 'بيانات المستند', desc: 'أدخل رقم قائمة التعبئة ورقم الفاتورة والتواريخ.' },
                s4: { n: '4', title: 'البنود والإجماليات', desc: 'أضف لكل بند رمز HS والوصف والكمية والوزن الصافي والإجمالي؛ تُحسب الإجماليات تلقائيًا.' },
            },
            tip: 'نصيحة: استخدم أزرار التكبير لتكبير النموذج والنقر على أي حقل للكتابة. ”طباعة / PDF“ ينتج صفحة A4 نظيفة.',
            show: 'إظهار الدليل', hide: 'إخفاء الدليل',
        },
    },
};

for (const lang of Object.keys(PACKING)) {
    const file = path.join(dir, `${lang}.json`);
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    j.invoice = j.invoice || {};
    j.invoice.table = Object.assign(j.invoice.table || {}, INVOICE_TABLE[lang]);
    j.packing = PACKING[lang];
    fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
    console.log(`updated ${lang}.json`);
}
