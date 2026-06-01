// Dynamic dispatcher — Vercel counts this as 1 serverless function.
// Routes /api/admin/<resource> to the matching handler in api/_handlers/admin/.
import banners from '../_handlers/admin/banners.js';
import faq from '../_handlers/admin/faq.js';
import flagCompanies from '../_handlers/admin/flag-companies.js';
import login from '../_handlers/admin/login.js';
import messages from '../_handlers/admin/messages.js';
import productNames from '../_handlers/admin/product-names.js';
import siteAssets from '../_handlers/admin/site-assets.js';
import translations from '../_handlers/admin/translations.js';
import pricing from '../_handlers/admin/pricing.js';
import subscriptions from '../_handlers/admin/subscriptions.js';
import { json } from '../_lib/db.js';

const HANDLERS = {
    'banners': banners,
    'faq': faq,
    'flag-companies': flagCompanies,
    'login': login,
    'messages': messages,
    'product-names': productNames,
    'site-assets': siteAssets,
    'translations': translations,
    'pricing': pricing,
    'subscriptions': subscriptions,
};

export default async function handler(req, res) {
    const resource = (req.query?.resource || '').toString();
    const fn = HANDLERS[resource];
    if (!fn) return json(res, 404, { error: 'not found' });
    return fn(req, res);
}
