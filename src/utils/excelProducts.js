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
    { field: 'maxStack',      aliases: ['maxstack', 'maxistif', 'maksistif', 'istif', 'stapel', 'stack', 'shtabel', 'empilage'] },
    { field: 'allowRotation', aliases: ['allowrotation', 'rotation', 'dondurulebilir', 'dondur', 'rotierbar', 'povorot', 'aldwran', 'rotate'] },
    { field: 'stackable',     aliases: ['stackable', 'istiflenebilir', 'stapelbar', 'shtabeliruemyy', 'empilable', 'kabllltkds', 'canstack'] },
    { field: 'color',         aliases: ['color', 'colour', 'renk', 'farbe', 'cvet', 'couleur', 'allwn'] },
];

const NUMERIC = new Set(['length', 'width', 'height', 'weight', 'quantity', 'maxStack']);
const BOOLEAN = new Set(['allowRotation', 'stackable']);

// --- Localised header labels (for the downloaded template) ------------------

const HEADER_LABELS = {
    tr: { name: 'Ürün Adı', length: 'Uzunluk (cm)', width: 'Genişlik (cm)', height: 'Yükseklik (cm)', weight: 'Ağırlık (kg)', quantity: 'Adet', maxStack: 'Max İstif', allowRotation: 'Döndürülebilir (E/H)', stackable: 'İstiflenebilir (E/H)', color: 'Renk (#hex)' },
    en: { name: 'Product Name', length: 'Length (cm)', width: 'Width (cm)', height: 'Height (cm)', weight: 'Weight (kg)', quantity: 'Quantity', maxStack: 'Max Stack', allowRotation: 'Rotation (Y/N)', stackable: 'Stackable (Y/N)', color: 'Color (#hex)' },
    de: { name: 'Produktname', length: 'Länge (cm)', width: 'Breite (cm)', height: 'Höhe (cm)', weight: 'Gewicht (kg)', quantity: 'Menge', maxStack: 'Max Stapel', allowRotation: 'Drehung (J/N)', stackable: 'Stapelbar (J/N)', color: 'Farbe (#hex)' },
    ru: { name: 'Название', length: 'Длина (см)', width: 'Ширина (см)', height: 'Высота (см)', weight: 'Вес (кг)', quantity: 'Количество', maxStack: 'Макс. штабель', allowRotation: 'Поворот (Д/Н)', stackable: 'Штабелируемый (Д/Н)', color: 'Цвет (#hex)' },
    fr: { name: 'Nom du produit', length: 'Longueur (cm)', width: 'Largeur (cm)', height: 'Hauteur (cm)', weight: 'Poids (kg)', quantity: 'Quantité', maxStack: 'Empilage max', allowRotation: 'Rotation (O/N)', stackable: 'Empilable (O/N)', color: 'Couleur (#hex)' },
    ar: { name: 'اسم المنتج', length: 'الطول (سم)', width: 'العرض (سم)', height: 'الارتفاع (سم)', weight: 'الوزن (كجم)', quantity: 'الكمية', maxStack: 'أقصى تكديس', allowRotation: 'الدوران (نعم/لا)', stackable: 'قابل للتكديس (نعم/لا)', color: 'اللون (#hex)' },
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

const TRUE_TOKENS = new Set(['e', 'evet', 'y', 'yes', 'true', '1', 'j', 'ja', 'oui', 'o', 'd', 'da', 'naam', 'نعم', 'var', 'x']);
const FALSE_TOKENS = new Set(['h', 'hayir', 'n', 'no', 'false', '0', 'nein', 'non', 'net', 'la', 'لا', 'yok']);

const parseBool = (v, fallback) => {
    if (v === true) return true;
    if (v === false) return false;
    const k = normalizeKey(v);
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

// Build header -> field lookup from the sheet's first row.
const buildHeaderMap = (headerRow) => {
    const map = {}; // columnIndex -> field
    headerRow.forEach((h, idx) => {
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
    const header = COLUMNS.map((c) => labels[c.field]);
    const example = ['Box A', 120, 80, 100, 25, 10, 3, 'N', 'Y', ''];
    const example2 = ['Box B', 60, 40, 40, 8, 24, 5, 'Y', 'Y', ''];

    const ws = XLSX.utils.aoa_to_sheet([header, example, example2]);
    ws['!cols'] = COLUMNS.map((c) => ({ wch: c.field === 'name' ? 18 : 14 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'ldm-stacking-template.xlsx');
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
            allowRotation: parseBool(rec.allowRotation, false),
            stackable: parseBool(rec.stackable, true),
            color: rec.color ? String(rec.color).trim() : '',
            useTotalWeight: false,
            totalWeight: '',
        });
    }
    return out;
};
