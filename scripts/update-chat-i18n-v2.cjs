// Second batch of live-chat widget strings: multi-session history, the
// inactivity auto-close flow and status labels. Visitor-facing → all 6 locales.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const DATA = {
    en: { chat: {
        history: 'Past chats', newChat: 'New chat', back: 'Back',
        closedNotice: 'This conversation has been closed.',
        startNew: 'Start a new chat',
        idleWarning: 'No activity for a while — this chat will close in {sec}s.',
        stayOpen: 'Keep chatting',
        noHistory: 'You have no previous chats yet.',
        statusOpen: 'Open', statusClosed: 'Closed',
        you: 'You', empty: 'No messages yet.',
    } },
    tr: { chat: {
        history: 'Geçmiş görüşmeler', newChat: 'Yeni görüşme', back: 'Geri',
        closedNotice: 'Bu görüşme kapatıldı.',
        startNew: 'Yeni görüşme başlat',
        idleWarning: 'Bir süredir yanıt yok — görüşme {sec} sn içinde kapanacak.',
        stayOpen: 'Görüşmeye devam et',
        noHistory: 'Henüz görüşmeniz yok.',
        statusOpen: 'Açık', statusClosed: 'Kapalı',
        you: 'Siz', empty: 'Henüz mesaj yok.',
    } },
    de: { chat: {
        history: 'Frühere Chats', newChat: 'Neuer Chat', back: 'Zurück',
        closedNotice: 'Diese Unterhaltung wurde geschlossen.',
        startNew: 'Neuen Chat starten',
        idleWarning: 'Längere Zeit keine Aktivität — der Chat schließt in {sec}s.',
        stayOpen: 'Weiter chatten',
        noHistory: 'Sie haben noch keine früheren Chats.',
        statusOpen: 'Offen', statusClosed: 'Geschlossen',
        you: 'Sie', empty: 'Noch keine Nachrichten.',
    } },
    ru: { chat: {
        history: 'Прошлые чаты', newChat: 'Новый чат', back: 'Назад',
        closedNotice: 'Этот разговор закрыт.',
        startNew: 'Начать новый чат',
        idleWarning: 'Нет активности — чат закроется через {sec} с.',
        stayOpen: 'Продолжить чат',
        noHistory: 'У вас пока нет прошлых чатов.',
        statusOpen: 'Открыт', statusClosed: 'Закрыт',
        you: 'Вы', empty: 'Пока нет сообщений.',
    } },
    fr: { chat: {
        history: 'Anciens chats', newChat: 'Nouveau chat', back: 'Retour',
        closedNotice: 'Cette conversation a été fermée.',
        startNew: 'Démarrer un nouveau chat',
        idleWarning: 'Aucune activité — ce chat se fermera dans {sec}s.',
        stayOpen: 'Continuer le chat',
        noHistory: "Vous n'avez pas encore de chats.",
        statusOpen: 'Ouvert', statusClosed: 'Fermé',
        you: 'Vous', empty: 'Pas encore de messages.',
    } },
    ar: { chat: {
        history: 'المحادثات السابقة', newChat: 'محادثة جديدة', back: 'رجوع',
        closedNotice: 'تم إغلاق هذه المحادثة.',
        startNew: 'بدء محادثة جديدة',
        idleWarning: 'لا يوجد نشاط — ستُغلق المحادثة خلال {sec} ثانية.',
        stayOpen: 'متابعة المحادثة',
        noHistory: 'لا توجد لديك محادثات سابقة بعد.',
        statusOpen: 'مفتوحة', statusClosed: 'مغلقة',
        you: 'أنت', empty: 'لا توجد رسائل بعد.',
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
