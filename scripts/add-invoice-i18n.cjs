// Adds invoice (Fatura) i18n: guide panel + form captions, for all 6 locales.
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const G = {
    tr: {
        guide: {
            title: 'Fatura nasıl doldurulur',
            intro: 'Bu şablon, Rusça mal beyanı içeren ihracat faturaları içindir. Taraf bilgilerini girin, logo ve kaşenizi yükleyin, kalemleri doldurup yazdırın.',
            steps: {
                s1: { n: '1', title: 'Taraflar', desc: 'Gönderici ve alıcı bilgilerini ilgili kutulara yazın.' },
                s2: { n: '2', title: 'Logo ve kaşe', desc: 'Logonuzu ve kaşenizi yükleyin; imza alanını fare veya dokunmatik ile imzalayın.' },
                s3: { n: '3', title: 'Fatura bilgileri', desc: 'Fatura tipi, doküman no, fatura ve düzenlenme tarihlerini girin.' },
                s4: { n: '4', title: 'Mal kalemleri', desc: 'Her satıra TN VED kodu, malın Rusça adı, adet, birim fiyat ve toplam (Euro) yazın.' },
                s5: { n: '5', title: 'Toplamlar', desc: 'Toplam miktar, indirim, KDV ve kur alanlarını doldurup yazdırın veya PDF kaydedin.' },
            },
            tip: 'İpucu: Yakınlaştırma düğmeleriyle formu büyütüp herhangi bir alana tıklayarak yazabilirsiniz. “Yazdır / PDF” temiz bir A4 sayfası üretir.',
            show: 'Kılavuzu göster', hide: 'Kılavuzu gizle',
        },
        form: {
            sender: 'GÖNDERİCİ BİLGİLERİ', recipient: 'ALICI BİLGİLERİ',
            logo: 'GÖNDERİCİ LOGOSU', stamp: 'KAŞE VE İMZA',
            invType: 'Fatura tipi', docNo: 'Doküman No', invDate: 'Fatura tarihi', issueDate: 'Düzenlenme tarihi',
            totalQty: 'Toplam miktar', totalGoods: 'Toplam mal', discount: 'İndirim', vat: 'KDV',
            vatIncl: 'KDV dahil fiyat', taxable: 'Vergiye tabidir', rate: 'Kur', totalAmount: 'Toplam mal bedeli',
            uploadLogo: 'Logo yükle', uploadStamp: 'Kaşe yükle', removeImage: 'Kaldır',
            clearSignature: 'İmzayı temizle', signHint: 'İmza',
        },
    },
    en: {
        guide: {
            title: 'How to fill the invoice',
            intro: 'This template is for export invoices with a Russian goods declaration. Enter party details, upload your logo and stamp, fill the line items and print.',
            steps: {
                s1: { n: '1', title: 'Parties', desc: 'Enter the sender and recipient details in the boxes.' },
                s2: { n: '2', title: 'Logo & stamp', desc: 'Upload your logo and stamp; sign the signature area with mouse or touch.' },
                s3: { n: '3', title: 'Invoice info', desc: 'Enter invoice type, document no and the invoice / issue dates.' },
                s4: { n: '4', title: 'Line items', desc: 'On each row add the TN VED code, Russian goods name, quantity, unit price and total (EUR).' },
                s5: { n: '5', title: 'Totals', desc: 'Fill total quantity, discount, VAT and rate, then print or save as PDF.' },
            },
            tip: 'Tip: use the zoom buttons to enlarge the form and click any field to type. “Print / PDF” produces a clean A4 page.',
            show: 'Show guide', hide: 'Hide guide',
        },
        form: {
            sender: 'SENDER DETAILS', recipient: 'RECIPIENT DETAILS',
            logo: 'SENDER LOGO', stamp: 'STAMP & SIGNATURE',
            invType: 'Invoice type', docNo: 'Document No', invDate: 'Invoice date', issueDate: 'Issue date',
            totalQty: 'Total quantity', totalGoods: 'Total goods', discount: 'Discount', vat: 'VAT',
            vatIncl: 'Price incl. VAT', taxable: 'Taxable', rate: 'Rate', totalAmount: 'Total goods value',
            uploadLogo: 'Upload logo', uploadStamp: 'Upload stamp', removeImage: 'Remove',
            clearSignature: 'Clear signature', signHint: 'Signature',
        },
    },
    de: {
        guide: {
            title: 'So füllen Sie die Rechnung aus',
            intro: 'Diese Vorlage ist für Exportrechnungen mit russischer Warendeklaration. Geben Sie die Parteien ein, laden Sie Logo und Stempel hoch, füllen Sie die Positionen aus und drucken Sie.',
            steps: {
                s1: { n: '1', title: 'Parteien', desc: 'Tragen Sie Absender- und Empfängerdaten in die Felder ein.' },
                s2: { n: '2', title: 'Logo & Stempel', desc: 'Logo und Stempel hochladen; das Unterschriftsfeld mit Maus oder Touch signieren.' },
                s3: { n: '3', title: 'Rechnungsdaten', desc: 'Rechnungsart, Dokument-Nr. sowie Rechnungs- und Ausstellungsdatum eingeben.' },
                s4: { n: '4', title: 'Positionen', desc: 'Je Zeile TN-VED-Code, russischer Warenname, Menge, Einzelpreis und Summe (EUR).' },
                s5: { n: '5', title: 'Summen', desc: 'Gesamtmenge, Rabatt, MwSt. und Kurs ausfüllen, dann drucken oder als PDF speichern.' },
            },
            tip: 'Tipp: Mit den Zoom-Tasten das Formular vergrößern und in beliebige Felder tippen. „Drucken / PDF“ erzeugt eine saubere A4-Seite.',
            show: 'Anleitung anzeigen', hide: 'Anleitung ausblenden',
        },
        form: {
            sender: 'ABSENDERDATEN', recipient: 'EMPFÄNGERDATEN',
            logo: 'ABSENDER-LOGO', stamp: 'STEMPEL & UNTERSCHRIFT',
            invType: 'Rechnungsart', docNo: 'Dokument-Nr.', invDate: 'Rechnungsdatum', issueDate: 'Ausstellungsdatum',
            totalQty: 'Gesamtmenge', totalGoods: 'Warenwert', discount: 'Rabatt', vat: 'MwSt.',
            vatIncl: 'Preis inkl. MwSt.', taxable: 'Steuerpflichtig', rate: 'Kurs', totalAmount: 'Gesamtwarenwert',
            uploadLogo: 'Logo hochladen', uploadStamp: 'Stempel hochladen', removeImage: 'Entfernen',
            clearSignature: 'Unterschrift löschen', signHint: 'Unterschrift',
        },
    },
    ru: {
        guide: {
            title: 'Как заполнить счёт',
            intro: 'Шаблон для экспортных счетов с наименованием товара на русском. Укажите стороны, загрузите логотип и печать, заполните позиции и распечатайте.',
            steps: {
                s1: { n: '1', title: 'Стороны', desc: 'Укажите данные отправителя и получателя в полях.' },
                s2: { n: '2', title: 'Логотип и печать', desc: 'Загрузите логотип и печать; распишитесь в поле подписи мышью или касанием.' },
                s3: { n: '3', title: 'Данные счёта', desc: 'Укажите тип счёта, номер документа, дату счёта и дату оформления.' },
                s4: { n: '4', title: 'Позиции товара', desc: 'В каждой строке: код ТН ВЭД, наименование на русском, шт, цена и итог (евро).' },
                s5: { n: '5', title: 'Итоги', desc: 'Заполните количество, скидку, НДС и курс, затем распечатайте или сохраните в PDF.' },
            },
            tip: 'Совет: кнопками масштаба увеличьте форму и нажмите на любое поле для ввода. «Печать / PDF» создаёт чистый лист A4.',
            show: 'Показать инструкцию', hide: 'Скрыть инструкцию',
        },
        form: {
            sender: 'ДАННЫЕ ОТПРАВИТЕЛЯ', recipient: 'ДАННЫЕ ПОЛУЧАТЕЛЯ',
            logo: 'ЛОГОТИП ОТПРАВИТЕЛЯ', stamp: 'ПЕЧАТЬ И ПОДПИСЬ',
            invType: 'Тип счёта', docNo: 'Номер документа', invDate: 'Дата счёта', issueDate: 'Дата оформления',
            totalQty: 'Общее количество', totalGoods: 'Итого товар', discount: 'Скидка', vat: 'НДС',
            vatIncl: 'Цена с НДС', taxable: 'Облагается налогом', rate: 'Курс', totalAmount: 'Общая стоимость товара',
            uploadLogo: 'Загрузить логотип', uploadStamp: 'Загрузить печать', removeImage: 'Удалить',
            clearSignature: 'Очистить подпись', signHint: 'Подпись',
        },
    },
    fr: {
        guide: {
            title: 'Comment remplir la facture',
            intro: "Ce modèle concerne les factures d'export avec désignation des marchandises en russe. Saisissez les parties, importez votre logo et votre cachet, remplissez les lignes et imprimez.",
            steps: {
                s1: { n: '1', title: 'Parties', desc: "Saisissez les coordonnées de l'expéditeur et du destinataire." },
                s2: { n: '2', title: 'Logo et cachet', desc: 'Importez votre logo et votre cachet ; signez la zone de signature à la souris ou au doigt.' },
                s3: { n: '3', title: 'Infos facture', desc: "Saisissez le type de facture, le n° de document et les dates de facture / d'émission." },
                s4: { n: '4', title: 'Lignes', desc: 'Par ligne : code TN VED, désignation en russe, quantité, prix unitaire et total (EUR).' },
                s5: { n: '5', title: 'Totaux', desc: 'Remplissez quantité, remise, TVA et taux, puis imprimez ou enregistrez en PDF.' },
            },
            tip: 'Astuce : utilisez les boutons de zoom pour agrandir le formulaire et cliquez sur un champ pour saisir. « Imprimer / PDF » produit une page A4 nette.',
            show: 'Afficher le guide', hide: 'Masquer le guide',
        },
        form: {
            sender: "COORDONNÉES DE L'EXPÉDITEUR", recipient: 'COORDONNÉES DU DESTINATAIRE',
            logo: "LOGO DE L'EXPÉDITEUR", stamp: 'CACHET ET SIGNATURE',
            invType: 'Type de facture', docNo: 'N° de document', invDate: 'Date de facture', issueDate: "Date d'émission",
            totalQty: 'Quantité totale', totalGoods: 'Total marchandises', discount: 'Remise', vat: 'TVA',
            vatIncl: 'Prix TTC', taxable: 'Imposable', rate: 'Taux', totalAmount: 'Valeur totale des marchandises',
            uploadLogo: 'Importer le logo', uploadStamp: 'Importer le cachet', removeImage: 'Supprimer',
            clearSignature: 'Effacer la signature', signHint: 'Signature',
        },
    },
    ar: {
        guide: {
            title: 'كيفية تعبئة الفاتورة',
            intro: 'هذا النموذج لفواتير التصدير مع بيان البضاعة بالروسية. أدخل بيانات الأطراف، وارفع الشعار والختم، واملأ البنود ثم اطبع.',
            steps: {
                s1: { n: '1', title: 'الأطراف', desc: 'أدخل بيانات المرسل والمستلم في الحقول.' },
                s2: { n: '2', title: 'الشعار والختم', desc: 'ارفع الشعار والختم؛ ووقّع في منطقة التوقيع بالفأرة أو باللمس.' },
                s3: { n: '3', title: 'بيانات الفاتورة', desc: 'أدخل نوع الفاتورة ورقم المستند وتاريخي الفاتورة والإصدار.' },
                s4: { n: '4', title: 'بنود البضاعة', desc: 'في كل صف: رمز TN VED، اسم البضاعة بالروسية، الكمية، السعر والإجمالي (يورو).' },
                s5: { n: '5', title: 'الإجماليات', desc: 'املأ الكمية والخصم والضريبة وسعر الصرف، ثم اطبع أو احفظ PDF.' },
            },
            tip: 'تلميح: استخدم أزرار التكبير لتكبير النموذج وانقر أي حقل للكتابة. «طباعة / PDF» تنتج صفحة A4 نظيفة.',
            show: 'إظهار الدليل', hide: 'إخفاء الدليل',
        },
        form: {
            sender: 'بيانات المرسل', recipient: 'بيانات المستلم',
            logo: 'شعار المرسل', stamp: 'الختم والتوقيع',
            invType: 'نوع الفاتورة', docNo: 'رقم المستند', invDate: 'تاريخ الفاتورة', issueDate: 'تاريخ الإصدار',
            totalQty: 'إجمالي الكمية', totalGoods: 'إجمالي البضاعة', discount: 'الخصم', vat: 'ضريبة القيمة المضافة',
            vatIncl: 'السعر شامل الضريبة', taxable: 'خاضع للضريبة', rate: 'سعر الصرف', totalAmount: 'إجمالي قيمة البضاعة',
            uploadLogo: 'رفع الشعار', uploadStamp: 'رفع الختم', removeImage: 'إزالة',
            clearSignature: 'مسح التوقيع', signHint: 'التوقيع',
        },
    },
};

for (const [lang, invoice] of Object.entries(G)) {
    const file = path.join(dir, `${lang}.json`);
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    j.invoice = invoice;
    fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
    console.log('updated', lang);
}
