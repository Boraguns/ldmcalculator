const fs = require('fs');
const path = require('path');

const tr = {
  wizard: { tip: 'Yan yatır', tipTitle: 'Bu ürün yan yatırılabilir mi? Açık olduğunda kutu herhangi bir yüzeyine yatırılarak daha sıkı yerleştirilebilir. Paletler için kapalı tutun.' },
  step3: { tipHint: "Sığmayan ürünler için o ürünün ayarlarındaki “Yan yatır” seçeneğini açmayı deneyin — kutular yan yatırılınca genelde hepsi sığar." },
};
const en = {
  wizard: { tip: 'Lay on side', tipTitle: 'May this product be laid on its side? When on, the box can rest on any face for tighter loading. Keep off for pallets.' },
  step3: { tipHint: 'For the products that did not fit, try enabling “Lay on side” in that product’s settings — boxes usually all fit once they can be tipped.' },
};
const de = {
  wizard: { tip: 'Kippen', tipTitle: 'Darf dieses Produkt auf die Seite gelegt werden? Wenn aktiv, kann die Kiste auf jeder Fläche liegen. Für Paletten ausgeschaltet lassen.' },
  step3: { tipHint: 'Aktivieren Sie für nicht passende Produkte „Kippen“ in deren Einstellungen — gekippt passt meist alles.' },
};
const ru = {
  wizard: { tip: 'На бок', tipTitle: 'Можно ли класть товар на бок? Включено — коробка может лежать на любой грани для плотной укладки. Для паллет держите выключенным.' },
  step3: { tipHint: 'Для непоместившихся товаров включите «На бок» в их настройках — на боку обычно помещается всё.' },
};
const fr = {
  wizard: { tip: 'Sur le côté', tipTitle: 'Ce produit peut-il être couché sur le côté ? Activé, la boîte peut reposer sur n’importe quelle face. À laisser désactivé pour les palettes.' },
  step3: { tipHint: 'Pour les produits non chargés, activez « Sur le côté » dans leurs réglages — couchés, ils rentrent généralement tous.' },
};
const ar = {
  wizard: { tip: 'على الجانب', tipTitle: 'هل يمكن وضع هذا المنتج على جانبه؟ عند التفعيل يمكن للصندوق الاستناد على أي وجه لتحميل أكثر إحكامًا. اتركه مغلقًا للمنصات.' },
  step3: { tipHint: 'للمنتجات التي لم تُحمَّل، فعّل خيار «على الجانب» في إعداداتها — عند الإمالة يتسع الجميع عادةً.' },
};

const map = { tr, en, de, ru, fr, ar };
for (const [lang, vals] of Object.entries(map)) {
  const file = path.join(__dirname, '..', 'src', 'i18n', 'locales', `${lang}.json`);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.wizard = j.wizard || {};
  j.wizard.tip = vals.wizard.tip;
  j.wizard.tipTitle = vals.wizard.tipTitle;
  j.step3 = j.step3 || {};
  j.step3.tipHint = vals.step3.tipHint;
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  console.log(`${lang}: wizard.tip/tipTitle + step3.tipHint added`);
}
