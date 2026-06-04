// Third batch of live-chat widget strings: visitor "end conversation" button
// and the blocked-by-admin notice. Visitor-facing → all 6 locales.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const DATA = {
    en: { chat: { end: 'End chat', blockedNotice: 'This chat has been blocked.' } },
    tr: { chat: { end: 'Görüşmeyi sonlandır', blockedNotice: 'Bu sohbet engellendi.' } },
    de: { chat: { end: 'Chat beenden', blockedNotice: 'Dieser Chat wurde gesperrt.' } },
    ru: { chat: { end: 'Завершить чат', blockedNotice: 'Этот чат заблокирован.' } },
    fr: { chat: { end: 'Terminer le chat', blockedNotice: 'Ce chat a été bloqué.' } },
    ar: { chat: { end: 'إنهاء المحادثة', blockedNotice: 'تم حظر هذه المحادثة.' } },
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
