// Pricing lookups + subscription period math + corporate seat proration.
// The `pricing` table holds one row per (plan, tier, period, currency).
import { sql } from './db.js';

export const CURRENCIES = ['TRY', 'USD', 'EUR'];
export const PERIODS = ['monthly', 'yearly'];
export const CORP_TIERS = [3, 5, 10, 20, 30, 50, 100];

export const isCurrency = (c) => CURRENCIES.includes(c);
export const isPeriod = (p) => PERIODS.includes(p);

// Resolve one active price row. tier is null for individual.
export async function getPrice({ plan, tier = null, period, currency }) {
    const rows = await sql`
        SELECT plan, tier, period, currency, amount, vat_rate
        FROM pricing
        WHERE plan = ${plan} AND period = ${period} AND currency = ${currency}
          AND COALESCE(tier, -1) = ${tier == null ? -1 : tier}
          AND active = TRUE
        LIMIT 1`;
    return rows[0] || null;
}

// All active prices, for rendering the public Pricing page.
export async function listPrices(currency = null) {
    if (currency) {
        return sql`SELECT plan, tier, period, currency, amount, vat_rate
                   FROM pricing WHERE active = TRUE AND currency = ${currency}
                   ORDER BY plan, COALESCE(tier, -1), period`;
    }
    return sql`SELECT plan, tier, period, currency, amount, vat_rate
               FROM pricing WHERE active = TRUE
               ORDER BY plan, COALESCE(tier, -1), period, currency`;
}

// VAT split. amount is the GROSS (VAT-inclusive) catalogue price; we expose the
// VAT component for invoices.
export function vatBreakdown(amount, vatRate) {
    const gross = Number(amount) || 0;
    const rate = Number(vatRate) || 0;
    const net = rate > 0 ? gross / (1 + rate / 100) : gross;
    const vat = gross - net;
    return { gross: round2(gross), net: round2(net), vat: round2(vat), rate };
}

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Period length helper → end date from a start date.
export function periodEnd(start, period) {
    const d = new Date(start);
    if (period === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d;
}

// Corporate seat-upgrade proration. When a company on `oldTier` seats upgrades
// to `newTier` mid-cycle, they pay only the price *difference*, scaled by the
// fraction of the current billing period still remaining.
//
//   charge = (newTierPrice − oldTierPrice) × (daysRemaining / daysInPeriod)
//
// Returns the prorated GROSS amount plus the figures used (for the invoice).
export async function computeSeatProration({ oldTier, newTier, period, currency, periodStart, periodEnd: pEnd, now = new Date() }) {
    if (newTier <= oldTier) {
        return { amount: 0, reason: 'no_upgrade', oldTier, newTier };
    }
    const [oldP, newP] = await Promise.all([
        getPrice({ plan: 'corporate', tier: oldTier, period, currency }),
        getPrice({ plan: 'corporate', tier: newTier, period, currency }),
    ]);
    if (!oldP || !newP) return { amount: 0, reason: 'price_missing', oldTier, newTier };

    const start = new Date(periodStart).getTime();
    const end = new Date(pEnd).getTime();
    const nowMs = new Date(now).getTime();
    const totalMs = Math.max(1, end - start);
    const remainingMs = Math.max(0, end - nowMs);
    const fraction = Math.min(1, remainingMs / totalMs);

    const diff = Number(newP.amount) - Number(oldP.amount);
    const amount = round2(Math.max(0, diff * fraction));
    return {
        amount, currency, period,
        oldTier, newTier,
        oldAmount: Number(oldP.amount), newAmount: Number(newP.amount),
        diff: round2(diff),
        fractionRemaining: round2(fraction),
        vatRate: Number(newP.vat_rate),
        ...vatBreakdown(amount, newP.vat_rate),
    };
}
