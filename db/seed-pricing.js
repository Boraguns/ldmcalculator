// Seed default pricing rows (idempotent). Admin can edit everything afterwards
// from the Pricing tab. Amounts here are sensible placeholders only.
// Usage:  DATABASE_URL=postgres://... node db/seed-pricing.js
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

const CURRENCIES = ['TRY', 'USD', 'EUR'];
const TIERS = [3, 5, 10, 20, 30, 50, 100];
// Base MONTHLY amounts. Yearly = monthly * 10 (≈2 months free).
const INDIVIDUAL_MONTHLY = { TRY: 199, USD: 9, EUR: 8 };
const CORP_PER_SEAT_MONTHLY = { TRY: 159, USD: 7, EUR: 6 }; // × seats, light volume discount
const VAT = { TRY: 20, USD: 0, EUR: 0 };

const rows = [];
// Individual
for (const cur of CURRENCIES) {
    const m = INDIVIDUAL_MONTHLY[cur];
    rows.push(['individual', null, 'monthly', cur, m, VAT[cur]]);
    rows.push(['individual', null, 'yearly', cur, m * 10, VAT[cur]]);
}
// Corporate per seat tier (flat package price = perSeat × seats × discount)
for (const seats of TIERS) {
    const discount = seats >= 50 ? 0.8 : seats >= 20 ? 0.88 : seats >= 10 ? 0.93 : 1;
    for (const cur of CURRENCIES) {
        const m = Math.round(CORP_PER_SEAT_MONTHLY[cur] * seats * discount);
        rows.push(['corporate', seats, 'monthly', cur, m, VAT[cur]]);
        rows.push(['corporate', seats, 'yearly', cur, m * 10, VAT[cur]]);
    }
}

let n = 0;
for (const [plan, tier, period, currency, amount, vat] of rows) {
    await sql`
        INSERT INTO pricing (plan, tier, period, currency, amount, vat_rate, active)
        VALUES (${plan}, ${tier}, ${period}, ${currency}, ${amount}, ${vat}, TRUE)
        ON CONFLICT (plan, COALESCE(tier, -1), period, currency) DO NOTHING
    `;
    n++;
}
console.log(`seeded ${n} pricing rows (existing rows left untouched)`);
