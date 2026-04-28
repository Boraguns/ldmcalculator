import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import en from './locales/en.json';
import tr from './locales/tr.json';
import de from './locales/de.json';
import ru from './locales/ru.json';
import fr from './locales/fr.json';

const dictionaries = { en, tr, de, ru, fr };
export const SUPPORTED_LANGS = [
    { code: 'en', label: 'English' },
    { code: 'tr', label: 'Türkçe' },
    { code: 'de', label: 'Deutsch' },
    { code: 'ru', label: 'Русский' },
    { code: 'fr', label: 'Français' }
];

const LanguageContext = createContext({ lang: 'en', setLang: () => {}, t: (k) => k });

const detectInitialLang = () => {
    try {
        const stored = localStorage.getItem('lang');
        if (stored && dictionaries[stored]) return stored;
        const nav = (navigator.language || 'en').toLowerCase().split('-')[0];
        if (dictionaries[nav]) return nav;
    } catch (e) { /* noop */ }
    return 'en';
};

const lookup = (dict, key) => {
    if (!dict) return undefined;
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    const parts = key.split('.');
    let cur = dict;
    for (const p of parts) {
        if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
        else return undefined;
    }
    return cur;
};

export const LanguageProvider = ({ children }) => {
    const [lang, setLangState] = useState(detectInitialLang);

    const setLang = useCallback((next) => {
        if (!dictionaries[next]) return;
        try { localStorage.setItem('lang', next); } catch (e) { /* noop */ }
        setLangState(next);
    }, []);

    useEffect(() => {
        try { document.documentElement.setAttribute('lang', lang); } catch (e) { /* noop */ }
    }, [lang]);

    const t = useCallback((key, vars) => {
        let val = lookup(dictionaries[lang], key);
        if (val === undefined) val = lookup(dictionaries.en, key);
        if (val === undefined) return key;
        if (vars && typeof val === 'string') {
            return val.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
        }
        return val;
    }, [lang]);

    const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useT = () => useContext(LanguageContext);

export const LanguageSwitcher = ({ style = {}, compact = false }) => {
    const { lang, setLang } = useContext(LanguageContext);
    return (
        <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label="Language"
            style={{
                background: 'rgba(0,0,0,0.55)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                padding: compact ? '4px 6px' : '6px 10px',
                fontSize: compact ? '0.75rem' : '0.85rem',
                cursor: 'pointer',
                ...style
            }}
        >
            {SUPPORTED_LANGS.map(l => (
                <option key={l.code} value={l.code} style={{ color: '#000' }}>{l.label}</option>
            ))}
        </select>
    );
};
