// Dynamic dispatcher — Vercel counts this as 1 serverless function.
// Routes /api/public/<resource> to the matching handler in api/_handlers/public/.
import config from '../_handlers/public/config.js';
import faq from '../_handlers/public/faq.js';
import translations from '../_handlers/public/translations.js';
import { json } from '../_lib/db.js';

const HANDLERS = {
    'config': config,
    'faq': faq,
    'translations': translations,
};

export default async function handler(req, res) {
    const resource = (req.query?.resource || '').toString();
    const fn = HANDLERS[resource];
    if (!fn) return json(res, 404, { error: 'not found' });
    return fn(req, res);
}
