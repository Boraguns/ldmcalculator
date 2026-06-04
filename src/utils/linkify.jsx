import React from 'react';

// Match bare http(s) URLs. The capturing group makes String.split keep the
// URLs in the resulting array (odd indices = matches).
const URL_RE = /(https?:\/\/[^\s<]+)/gi;
// Punctuation that commonly trails a URL in prose but isn't part of it.
const TRAIL_RE = /[.,!?;:)\]}'"]+$/;

/**
 * Turn the bare URLs inside a plain-text string into clickable <a> elements,
 * leaving the rest of the text untouched. Returns an array of React nodes.
 *
 *   linkify('see https://x.com/a, thanks', { color: '#60a5fa' })
 *
 * Links open in a new tab and are hardened with rel="noopener noreferrer
 * nofollow" since chat content is user-supplied.
 */
export function linkify(text, linkStyle) {
    const str = String(text ?? '');
    if (!str) return str;
    const parts = str.split(URL_RE);
    return parts.map((part, i) => {
        if (i % 2 === 0) return part;            // plain text segment
        let url = part;
        let trail = '';
        const m = url.match(TRAIL_RE);
        if (m) { trail = m[0]; url = url.slice(0, -trail.length); }
        return (
            <React.Fragment key={i}>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    style={{ wordBreak: 'break-all', ...linkStyle }}
                >{url}</a>
                {trail}
            </React.Fragment>
        );
    });
}
