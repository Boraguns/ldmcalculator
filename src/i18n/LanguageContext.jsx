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

export const LanguageSwitcher = ({ style = {}, compact = false, height }) => {
    const { lang, setLang } = useContext(LanguageContext);
    const h = height ?? (compact ? 40 : 48);
    return (
        <div
            className="ai-btn ai-language-switcher"
            style={{
                padding: '2px',
                height: `${h}px`,
                cursor: 'pointer',
                ...style
            }}
        >
            <div
                className="ai-btn-inner"
                style={{
                    padding: 0,
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    background: '#1a1a1a',
                    borderRadius: '10px'
                }}
            >
                <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    aria-label="Language"
                    className="ai-language-select"
                    style={{
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: '#fff',
                        fontFamily: 'inherit',
                        fontSize: compact ? '0.85rem' : '0.95rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        padding: `0 32px 0 16px`,
                        height: '100%',
                        width: '100%',
                        backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")",
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 10px center',
                        backgroundSize: '14px'
                    }}
                >
                    {SUPPORTED_LANGS.map(l => (
                        <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};
