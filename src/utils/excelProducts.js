// Excel import/export for the truck-stacking product list.
//
// SheetJS (`xlsx`) is heavy (~400 KB), so it is dynamically imported only
// when the user actually downloads a template or uploads a file — it never
// lands in the main bundle.
//
// The parser is header-driven and language-agnostic: a column is matched by
// normalising its header and comparing against a set of aliases covering all
// six UI languages plus the raw English field names. So a template downloaded
// in Turkish can be re-uploaded regardless of the current UI language.

// --- Column model -----------------------------------------------------------

// Ordered list of columns used both to BUILD the template and to MATCH on
// import. `aliases` are compared after normalisation (lowercase, parenthetical
// units like "(cm)" stripped, punctuation/whitespace collapsed).
const COLUMNS = [
    { field: 'name',          aliases: ['name', 'product', 'productname', 'urunadi', 'urun', 'produkt', 'nazvanie', 'nom', 'alism', 'alasm'] },
    { field: 'length',        aliases: ['length', 'uzunluk', 'lange', 'dlina', 'longueur', 'tul', 'len'] },
    { field: 'width',         aliases: ['width', 'genislik', 'breite', 'shirina', 'largeur', 'ard'] },
    { field: 'height',        aliases: ['height', 'yukseklik', 'hohe', 'vysota', 'hauteur', 'altrtfa', 'irtifa'] },
    { field: 'weight',        aliases: ['weight', 'agirlik', 'gewicht', 'ves', 'poids', 'alvzn', 'kg'] },
    { field: 'quantity',      aliases: ['quantity', 'qty', 'adet', 'menge', 'kolichestvo', 'quantite', 'alkmy', 'count'] },
    // NOTE: "Max Stack" is intentionally NOT a template column. It is computed
    // automatically on import from the box height vs the container height, so
    // the user never has to fill it in.
    { field: 'allowRotation', aliases: ['allowrotation', 'rotation', 'dondurulebilir', 'dondur', 'rotierbar', 'povorot', 'aldwran', 'rotate'] },
    // Stacking type, 1-5: 1=not stackable (floor only), 2=fully stackable,
    // 3=self-stack, 4=carrier (base, bears others), 5=topper (rides on others).
    // (Legacy Y/N booleans are still accepted on import.)
    { field: 'stackMode',     aliases: ['stackmode', 'istifturu', 'istifleme', 'stackable', 'istiflenebilir', 'stapelbar', 'shtabeliruemyy', 'empilable', 'kabllltkds', 'canstack'] },
    { field: 'color',         aliases: ['color', 'colour', 'renk', 'farbe', 'cvet', 'couleur', 'allwn'] },
];

const NUMERIC = new Set(['length', 'width', 'height', 'weight', 'quantity']);
const BOOLEAN = new Set(['allowRotation']);

// Stacking-type code <-> mode: 1=none 2=full 3=self 4=carrier 5=topper.
const STACK_MODE_BY_NUM = { 1: 'none', 2: 'full', 3: 'self', 4: 'carrier', 5: 'topper' };
// Export map. Legacy names collapse so old data round-trips.
const NUM_BY_STACK_MODE = { none: 1, full: 2, self: 3, carrier: 4, topper: 5, both: 2, bear: 4, top: 5 };

// Yes/No tokens used in the EXAMPLE rows of the downloaded template, matching
// the (E/H), (Y/N), (J/N)… hint shown in each language's column headers so the
// header and the sample values are consistent. All of these are recognised by
// the parser's TRUE_TOKENS / FALSE_TOKENS sets.
const YESNO = {
    tr: { y: 'E', n: 'H' },
    en: { y: 'Y', n: 'N' },
    de: { y: 'J', n: 'N' },
    ru: { y: 'Д', n: 'Н' },
    fr: { y: 'O', n: 'N' },
    ar: { y: 'نعم', n: 'لا' },
};

// --- Localised header labels (for the downloaded template) ------------------

const HEADER_LABELS = {
    tr: { name: 'Ürün Adı', length: 'Uzunluk (cm)', width: 'Genişlik (cm)', height: 'Yükseklik (cm)', weight: 'Ağırlık (kg)', quantity: 'Adet', maxStack: 'Max İstif', allowRotation: 'Döndürülebilir (E/H)', stackMode: 'İstif Türü (1-5)', color: 'Renk (isim)' },
    en: { name: 'Product Name', length: 'Length (cm)', width: 'Width (cm)', height: 'Height (cm)', weight: 'Weight (kg)', quantity: 'Quantity', maxStack: 'Max Stack', allowRotation: 'Rotation (Y/N)', stackMode: 'Stacking (1-5)', color: 'Color (name)' },
    de: { name: 'Produktname', length: 'Länge (cm)', width: 'Breite (cm)', height: 'Höhe (cm)', weight: 'Gewicht (kg)', quantity: 'Menge', maxStack: 'Max Stapel', allowRotation: 'Drehung (J/N)', stackMode: 'Stapelart (1-5)', color: 'Farbe (Name)' },
    ru: { name: 'Название', length: 'Длина (см)', width: 'Ширина (см)', height: 'Высота (см)', weight: 'Вес (кг)', quantity: 'Количество', maxStack: 'Макс. штабель', allowRotation: 'Поворот (Д/Н)', stackMode: 'Тип штабел. (1-5)', color: 'Цвет (название)' },
    fr: { name: 'Nom du produit', length: 'Longueur (cm)', width: 'Largeur (cm)', height: 'Hauteur (cm)', weight: 'Poids (kg)', quantity: 'Quantité', maxStack: 'Empilage max', allowRotation: 'Rotation (O/N)', stackMode: 'Empilage (1-5)', color: 'Couleur (nom)' },
    ar: { name: 'اسم المنتج', length: 'الطول (سم)', width: 'العرض (سم)', height: 'الارتفاع (سم)', weight: 'الوزن (كجم)', quantity: 'الكمية', maxStack: 'أقصى تكديس', allowRotation: 'الدوران (نعم/لا)', stackMode: 'نوع التكديس (1-5)', color: 'اللون (الاسم)' },
};

// --- Named colours ----------------------------------------------------------
// Excel cells can't host an HTML colour picker, so instead of a hex code the
// user types a plain colour NAME (e.g. "Mavi"/"Blue"). The template ships a
// "Colors" reference sheet listing the valid names, and the parser maps any of
// them (in any of the 6 languages) to a hex value. Raw hex is still accepted.

// Canonical colour -> hex.
const COLOR_HEX = {
    red: '#ef4444', blue: '#3b82f6', green: '#10b981', yellow: '#f59e0b',
    orange: '#f97316', purple: '#8b5cf6', pink: '#ec4899', gray: '#6b7280',
    black: '#111827', white: '#f3f4f6', teal: '#14b8a6', brown: '#92400e',
};

// Per-language display names (same order as COLOR_HEX keys) for the template.
const COLOR_ORDER = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'gray', 'black', 'white', 'teal', 'brown'];
const COLOR_NAMES = {
    tr: ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı', 'Turuncu', 'Mor', 'Pembe', 'Gri', 'Siyah', 'Beyaz', 'Turkuaz', 'Kahverengi'],
    en: ['Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink', 'Gray', 'Black', 'White', 'Teal', 'Brown'],
    de: ['Rot', 'Blau', 'Grün', 'Gelb', 'Orange', 'Lila', 'Rosa', 'Grau', 'Schwarz', 'Weiß', 'Türkis', 'Braun'],
    ru: ['Красный', 'Синий', 'Зелёный', 'Жёлтый', 'Оранжевый', 'Фиолетовый', 'Розовый', 'Серый', 'Чёрный', 'Белый', 'Бирюзовый', 'Коричневый'],
    fr: ['Rouge', 'Bleu', 'Vert', 'Jaune', 'Orange', 'Violet', 'Rose', 'Gris', 'Noir', 'Blanc', 'Turquoise', 'Marron'],
    ar: ['أحمر', 'أزرق', 'أخضر', 'أصفر', 'برتقالي', 'بنفسجي', 'وردي', 'رمادي', 'أسود', 'أبيض', 'فيروزي', 'بني'],
};

// Normaliser that preserves non-Latin letters (Cyrillic/Arabic) so colour
// names in every language survive — only drops case, spaces and diacritics.
const normColor = (s) => String(s == null ? '' : s)
    .trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '');

// normalisedName -> hex, built from every language's name list + the canonical
// English keys.
const COLOR_LOOKUP = (() => {
    const m = {};
    for (const key of COLOR_ORDER) m[normColor(key)] = COLOR_HEX[key];
    for (const list of Object.values(COLOR_NAMES)) {
        list.forEach((nm, i) => { m[normColor(nm)] = COLOR_HEX[COLOR_ORDER[i]]; });
    }
    return m;
})();

// Resolve a cell value to a hex colour: accepts #rrggbb / rrggbb hex or a
// colour name in any supported language. Returns '' when unrecognised/empty.
const resolveColor = (raw) => {
    const s = String(raw == null ? '' : raw).trim();
    if (!s) return '';
    if (/^#?[0-9a-fA-F]{6}$/.test(s)) return s.startsWith('#') ? s : `#${s}`;
    return COLOR_LOOKUP[normColor(s)] || '';
};

// --- Helpers ----------------------------------------------------------------

// Normalise any header / cell into a comparable token: lowercase, drop the
// unit/parenthetical part, transliterate the few accented Latin chars we use,
// and strip everything that isn't a letter or digit.
const normalizeKey = (s) => String(s == null ? '' : s)
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')          // remove "(cm)", "(Y/N)", ...
    .replace(/[ışğüöç]/g, (c) => ({ 'ı': 'i', 'ş': 's', 'ğ': 'g', 'ü': 'u', 'ö': 'o', 'ç': 'c' }[c]))
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9]/g, '');

// Yes/No tokens across the 6 UI languages. Compared with normColor (which
// keeps Cyrillic/Arabic letters), so Russian "Да/Нет" and Arabic "نعم/لا" work.
const TRUE_TOKENS = new Set(['e', 'evet', 'y', 'yes', 'true', '1', 'j', 'ja', 'oui', 'o', 'd', 'da', 'д', 'да', 'نعم', 'var', 'x']);
const FALSE_TOKENS = new Set(['h', 'hayir', 'n', 'no', 'false', '0', 'nein', 'non', 'net', 'н', 'нет', 'la', 'لا', 'yok']);

const parseBool = (v, fallback) => {
    if (v === true) return true;
    if (v === false) return false;
    const k = normColor(v); // unicode-preserving lowercase/trim
    if (!k) return fallback;
    if (TRUE_TOKENS.has(k)) return true;
    if (FALSE_TOKENS.has(k)) return false;
    return fallback;
};

const parseNum = (v) => {
    if (v == null || v === '') return '';
    // Accept both "1,5" and "1.5"; strip spaces / thousands separators.
    const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : '';
};

// Stacking type: a 1-5 code (1=none, 2=full, 3=self, 4=carrier, 5=topper).
// Falls back to the legacy Yes/No (stackable) when a boolean-ish value is given.
// Default 'full'.
const parseStackMode = (v) => {
    if (v == null || v === '') return 'full';
    const n = parseInt(String(v).trim(), 10);
    if (n >= 1 && n <= 5) return STACK_MODE_BY_NUM[n];
    const b = parseBool(v, null);
    if (b === true) return 'full';
    if (b === false) return 'none';
    return 'full';
};

// Exact localised header -> field lookup, built from every language's
// HEADER_LABELS using the unicode-preserving normaliser, so Cyrillic/Arabic
// headers (which normalizeKey would strip to nothing) still match.
const stripParen = (s) => String(s == null ? '' : s).replace(/\(.*?\)/g, ' ');
const LABEL_LOOKUP = (() => {
    const m = {};
    for (const labels of Object.values(HEADER_LABELS)) {
        for (const [field, label] of Object.entries(labels)) {
            const k = normColor(stripParen(label));
            if (k) m[k] = field;
        }
    }
    return m;
})();

// Build header -> field lookup from the sheet's first row.
const buildHeaderMap = (headerRow) => {
    const map = {}; // columnIndex -> field
    headerRow.forEach((h, idx) => {
        // 1) Exact localised label match (handles all scripts).
        const uni = normColor(stripParen(h));
        if (uni && LABEL_LOOKUP[uni]) { map[idx] = LABEL_LOOKUP[uni]; return; }
        // 2) Latin alias match.
        const key = normalizeKey(h);
        if (!key) return;
        for (const col of COLUMNS) {
            if (col.aliases.includes(key)) { map[idx] = col.field; return; }
        }
        // loose contains-match as a fallback (e.g. "uzunlukcm")
        for (const col of COLUMNS) {
            if (col.aliases.some((a) => a.length >= 3 && key.includes(a))) { map[idx] = col.field; return; }
        }
    });
    return map;
};

// --- Public API -------------------------------------------------------------

/**
 * Download a blank product template (.xlsx) with localised headers and one
 * example row, so the user has the exact column layout to fill in.
 * @param {'tr'|'en'|'de'|'ru'|'fr'|'ar'} lang
 */
export const downloadProductTemplate = async (lang = 'en') => {
    const XLSX = await import('xlsx');
    const labels = HEADER_LABELS[lang] || HEADER_LABELS.en;
    const names = COLOR_NAMES[lang] || COLOR_NAMES.en;
    const yn = YESNO[lang] || YESNO.en;
    const header = COLUMNS.map((c) => labels[c.field]);
    // Example rows use friendly colour NAMES so the user copies the pattern
    // (instead of guessing hex). Colour is optional — leaving it blank lets the
    // app auto-assign one. Yes/No values match the header hint for the language.
    const example = ['Box A', 120, 80, 100, 25, 10, yn.n, 3, names[1]]; // Blue · stacking 3 = self-stack
    const example2 = ['Box B', 60, 40, 40, 8, 24, yn.y, 2, names[0]];   // Red  · stacking 2 = fully stackable

    const ws = XLSX.utils.aoa_to_sheet([header, example, example2]);
    ws['!cols'] = COLUMNS.map((c) => ({ wch: c.field === 'name' ? 18 : 14 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');

    // Reference sheet: the list of valid colour names the user can type in the
    // colour column (with the matching hex for anyone who prefers it).
    const colorTitle = labels.color;
    const refRows = [[colorTitle, 'HEX']];
    COLOR_ORDER.forEach((k, i) => refRows.push([names[i], COLOR_HEX[k]]));
    const refWs = XLSX.utils.aoa_to_sheet(refRows);
    refWs['!cols'] = [{ wch: 16 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, refWs, 'Colors');

    XLSX.writeFile(wb, 'ldm-stacking-template.xlsx');
};

/**
 * Export the user's manually-entered products into the SAME template layout so
 * they can save their work and re-upload it later without retyping. Yes/No and
 * column headers follow the chosen language; colours are written as hex (the
 * parser accepts hex or names).
 * @param {Array} products  InputWizard product objects
 * @param {'tr'|'en'|'de'|'ru'|'fr'|'ar'} lang
 */
export const exportProductsToFile = async (products = [], lang = 'en') => {
    const XLSX = await import('xlsx');
    const labels = HEADER_LABELS[lang] || HEADER_LABELS.en;
    const names = COLOR_NAMES[lang] || COLOR_NAMES.en;
    const yn = YESNO[lang] || YESNO.en;
    const header = COLUMNS.map((c) => labels[c.field]);

    // Map a hex colour back to a localised name when possible (else keep raw).
    const hexToName = {};
    COLOR_ORDER.forEach((k, i) => { hexToName[COLOR_HEX[k].toLowerCase()] = names[i]; });

    const num = (v) => {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : '';
    };

    const rows = products.map((p) => {
        const qty = parseInt(p.quantity);
        // Always export the PER-UNIT weight (what the template expects), even if
        // the user entered a total weight.
        let unitW = num(p.weight);
        if (p.useTotalWeight && p.totalWeight && qty > 0) {
            unitW = Math.round((parseFloat(p.totalWeight) / qty) * 100) / 100;
        }
        const out = {
            name: (p.name || '').trim(),
            length: num(p.length),
            width: num(p.width),
            height: num(p.height),
            weight: unitW,
            quantity: Number.isFinite(qty) ? qty : '',
            allowRotation: p.allowRotation ? yn.y : yn.n,
            stackMode: NUM_BY_STACK_MODE[p.stackMode || (p.stackable === false ? 'none' : 'full')] || 2,
            color: p.color ? (hexToName[String(p.color).toLowerCase()] || p.color) : '',
        };
        return COLUMNS.map((c) => out[c.field]);
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = COLUMNS.map((c) => ({ wch: c.field === 'name' ? 18 : 14 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');

    // Same colour reference sheet as the template, for consistency on re-edit.
    const refRows = [[labels.color, 'HEX']];
    COLOR_ORDER.forEach((k, i) => refRows.push([names[i], COLOR_HEX[k]]));
    const refWs = XLSX.utils.aoa_to_sheet(refRows);
    refWs['!cols'] = [{ wch: 16 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, refWs, 'Colors');

    XLSX.writeFile(wb, 'ldm-products.xlsx');
};

/**
 * Parse an uploaded .xlsx / .xls / .csv file into product objects matching the
 * InputWizard product schema. Resolves to an array; rejects on a read error.
 * Rows missing the essential numeric dimensions are skipped.
 * @param {File} file
 * @returns {Promise<Array>}
 */
export const parseProductsFile = async (file) => {
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return [];

    // Read as a matrix so we control header detection ourselves.
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' });
    if (!rows.length) return [];

    const headerMap = buildHeaderMap(rows[0]);
    // If the first row didn't look like a header at all, bail (avoid eating data).
    if (!Object.keys(headerMap).length) return [];

    const out = [];
    let nextId = 1;
    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.every((c) => c === '' || c == null)) continue;

        const rec = {};
        for (const [idxStr, field] of Object.entries(headerMap)) {
            rec[field] = row[Number(idxStr)];
        }

        const length = parseNum(rec.length);
        const width = parseNum(rec.width);
        const height = parseNum(rec.height);
        const quantity = parseNum(rec.quantity);
        const weight = parseNum(rec.weight);

        // Essential fields — a row without real dimensions/qty is noise.
        if (!length || !width || !height || !quantity) continue;

        out.push({
            id: nextId++,
            name: rec.name != null ? String(rec.name).trim() : '',
            length: String(length),
            width: String(width),
            height: String(height),
            weight: weight ? String(weight) : '',
            quantity: String(quantity),
            maxStack: rec.maxStack != null && parseNum(rec.maxStack) ? parseNum(rec.maxStack) : 1,
            // Rotation defaults ON (permission, not obligation): matches the UI
            // default so imports without the column pack as well as manual entry.
            allowRotation: parseBool(rec.allowRotation, true),
            stackMode: parseStackMode(rec.stackMode),
            color: resolveColor(rec.color),
            useTotalWeight: false,
            totalWeight: '',
        });
    }
    return out;
};
