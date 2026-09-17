import { useCallback, useEffect } from 'react';

// Keeps typed text INSIDE its box on a fixed A4 sheet, so nothing is clipped
// on screen or cut off when printed.
//  - Default: shrink the font in 0.5px steps (floor 6px) until the text fits
//    the field's width and height; grows back to the stylesheet size when the
//    text gets shorter again.
//  - `.fit-grow` textareas (wrapping table cells) keep their font and grow
//    taller instead, so a long description wraps onto extra lines.
// One delegated `input` listener handles typing; the effect re-runs whenever
// `deps` change so restored drafts and added rows fit too.
export default function useFitFields(rootRef, selector, deps = []) {
    const fit = useCallback((el) => {
        if (!el || !el.matches?.(selector)) return;
        if (el.classList.contains('fit-grow')) {
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
            return;
        }
        if (!el.dataset.maxFs) el.dataset.maxFs = String(parseFloat(getComputedStyle(el).fontSize) || 10);
        let fs = parseFloat(el.dataset.maxFs);
        el.style.fontSize = fs + 'px';
        const overflows = () => el.scrollWidth > el.clientWidth + 0.5 || el.scrollHeight > el.clientHeight + 0.5;
        while (overflows() && fs > 6) {
            fs -= 0.5;
            el.style.fontSize = fs + 'px';
        }
    }, [selector]);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return undefined;
        root.querySelectorAll(selector).forEach(fit);
        const onInput = (e) => fit(e.target);
        root.addEventListener('input', onInput);
        return () => root.removeEventListener('input', onInput);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fit, rootRef, ...deps]);
}
