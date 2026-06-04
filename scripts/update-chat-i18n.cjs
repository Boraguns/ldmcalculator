// Visitor-facing live-chat widget strings (admin panel chat tab is TR-only).
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const DATA = {
    en: { chat: {
        title: 'Live support', subtitle: "We typically reply in a few minutes",
        greeting: 'Hi! 👋 How can we help you today?',
        placeholder: 'Type your message…', send: 'Send',
        open: 'Open live chat', close: 'Close',
        name: 'Name', email: 'Email', optional: 'optional',
    } },
    tr: { chat: {
        title: 'Canlı destek', subtitle: 'Genellikle birkaç dakikada yanıtlıyoruz',
        greeting: 'Merhaba! 👋 Size nasıl yardımcı olabiliriz?',
        placeholder: 'Mesajınızı yazın…', send: 'Gönder',
        open: 'Canlı sohbeti aç', close: 'Kapat',
        name: 'Ad', email: 'E-posta', optional: 'isteğe bağlı',
    } },
    de: { chat: {
        title: 'Live-Support', subtitle: 'Wir antworten meist in wenigen Minuten',
        greeting: 'Hallo! 👋 Wie können wir helfen?',
        placeholder: 'Nachricht eingeben…', send: 'Senden',
        open: 'Live-Chat öffnen', close: 'Schließen',
        name: 'Name', email: 'E-Mail', optional: 'optional',
    } },
    ru: { chat: {
        title: 'Онлайн-поддержка', subtitle: 'Обычно отвечаем за несколько минут',
        greeting: 'Здравствуйте! 👋 Чем можем помочь?',
        placeholder: 'Введите сообщение…', send: 'Отправить',
        open: 'Открыть чат', close: 'Закрыть',
        name: 'Имя', email: 'Эл. почта', optional: 'необязательно',
    } },
    fr: { chat: {
        title: 'Support en direct', subtitle: 'Nous répondons en quelques minutes',
        greeting: 'Bonjour ! 👋 Comment pouvons-nous vous aider ?',
        placeholder: 'Saisissez votre message…', send: 'Envoyer',
        open: 'Ouvrir le chat', close: 'Fermer',
        name: 'Nom', email: 'E-mail', optional: 'facultatif',
    } },
    ar: { chat: {
        title: 'الدعم المباشر', subtitle: 'نرد عادةً خلال دقائق',
        greeting: 'مرحبًا! 👋 كيف يمكننا مساعدتك؟',
        placeholder: 'اكتب رسالتك…', send: 'إرسال',
        open: 'فتح المحادثة', close: 'إغلاق',
        name: 'الاسم', email: 'البريد الإلكتروني', optional: 'اختياري',
    } },
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
