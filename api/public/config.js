// GET /api/public/config — returns banner image URLs and per-country featured
// company info. Used by the front-end on the truck page so admins can update
// content without redeploying.
import { sql, json } from '../_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    try {
        const banners = await sql`SELECT slot, image_url FROM banners`;
        const companies = await sql`
            SELECT country_code, name, description, logo_url, website, is_featured, sort_order
            FROM flag_companies
            ORDER BY country_code, sort_order ASC, id ASC
        `;
        const banner = { left: '/banners/left.jpg', right: '/banners/right.jpg', top: '/banners/top.jpg' };
        for (const r of banners) banner[r.slot] = r.image_url;
        const companiesByCountry = {};
        for (const c of companies) {
            if (!companiesByCountry[c.country_code]) companiesByCountry[c.country_code] = [];
            companiesByCountry[c.country_code].push(c);
        }
        return json(res, 200, { banner, companies: companiesByCountry });
    } catch (e) {
        console.error('public/config', e);
        return json(res, 500, { error: 'server error' });
    }
}
