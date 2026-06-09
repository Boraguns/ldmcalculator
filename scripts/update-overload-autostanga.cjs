const fs = require('fs');
const path = require('path');

const vals = {
  tr: {
    notFitNamed: '{name}: {n} adet dışarıda kaldı',
    autoStanga: 'Otomatik ştanga ekle',
    autoStangaNone: 'Devrilme riski olan istif bulunamadı; ştangaya gerek yok.',
  },
  en: {
    notFitNamed: '{name}: {n} units left out',
    autoStanga: 'Auto anti-tip bars',
    autoStangaNone: 'No tip-prone stacks found; no bars needed.',
  },
  de: {
    notFitNamed: '{name}: {n} Einheiten passten nicht',
    autoStanga: 'Auto-Sicherungsstangen',
    autoStangaNone: 'Keine kippgefährdeten Stapel gefunden; keine Stangen nötig.',
  },
  ru: {
    notFitNamed: '{name}: {n} шт. не поместилось',
    autoStanga: 'Авто-распорки',
    autoStangaNone: 'Неустойчивых штабелей не найдено; распорки не нужны.',
  },
  fr: {
    notFitNamed: '{name} : {n} unités non chargées',
    autoStanga: 'Barres anti-bascule auto',
    autoStangaNone: 'Aucune pile à risque de basculement ; aucune barre nécessaire.',
  },
  ar: {
    notFitNamed: '{name}: {n} وحدة لم تُحمَّل',
    autoStanga: 'قضبان تثبيت تلقائية',
    autoStangaNone: 'لا توجد أكوام معرضة للسقوط؛ لا حاجة للقضبان.',
  },
};

for (const [lang, kv] of Object.entries(vals)) {
  const file = path.join(__dirname, '..', 'src', 'i18n', 'locales', `${lang}.json`);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.step3 = j.step3 || {};
  j.step3.notFitNamed = kv.notFitNamed;
  j.step3.autoStanga = kv.autoStanga;
  j.step3.autoStangaNone = kv.autoStangaNone;
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  console.log(`${lang}: step3.notFitNamed/autoStanga/autoStangaNone updated`);
}
