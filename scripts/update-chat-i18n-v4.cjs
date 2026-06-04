// Fourth batch of live-chat widget strings: make name/email mandatory.
// "required" label + validation messages. Visitor-facing → all 6 locales.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const DATA = {
    en: { chat: { required: 'required', leadRequired: 'Please enter your name and email to start.', invalidEmail: 'Please enter a valid email address.' } },
    tr: { chat: { required: 'zorunlu', leadRequired: 'Başlamak için lütfen adınızı ve e-postanızı girin.', invalidEmail: 'Lütfen geçerli bir e-posta adresi girin.' } },
    de: { chat: { required: 'erforderlich', leadRequired: 'Bitte geben Sie Ihren Namen und Ihre E-Mail-Adresse ein.', invalidEmail: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' } },
    ru: { chat: { required: 'обязательно', leadRequired: 'Введите имя и адрес электронной почты, чтобы начать.', invalidEmail: 'Введите действительный адрес электронной почты.' } },
    fr: { chat: { required: 'obligatoire', leadRequired: 'Veuillez saisir votre nom et votre e-mail pour commencer.', invalidEmail: 'Veuillez saisir une adresse e-mail valide.' } },
    ar: { chat: { required: 'مطلوب', leadRequired: 'يرجى إدخال اسمك وبريدك الإلكتروني للبدء.', invalidEmail: 'يرجى إدخال عنوان بريد إلكتروني صالح.' } },
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
