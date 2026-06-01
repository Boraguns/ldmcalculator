# LDMCalculator — SaaS Layer Setup

This document explains how to provision and run the free-tier limit + individual /
corporate subscription system (auth, usage metering, PayTR billing, account panels,
admin pricing/subscription tabs, legal texts).

> Card data is handled entirely by **PayTR** and is never stored by this app.
> IP / fingerprint signals are HMAC-hashed before storage. Admin tokens and
> end-user tokens never cross-authenticate (`typ:'user'` claim).
> Legal texts under `src/pages/legal/` are **templates** — have a lawyer review
> them before production use.

---

## 1. Environment variables

Set these in Vercel (Project → Settings → Environment Variables) or in a local
`.env` for the migration scripts. See `.env.example` for a copy-paste template.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Neon Postgres connection string (HTTP driver). |
| `JWT_SECRET` | yes | Signs end-user + admin JWTs. Use a long random string. |
| `COOKIE_SECRET` | yes | Signs the anonymous-id cookie (`ldm_aid`). |
| `APP_URL` | yes | Public base URL, e.g. `https://ldmcalculator.com`. Used for verify / invite / PayTR callback links. |
| `PAYTR_MERCHANT_ID` | for billing | PayTR merchant id. |
| `PAYTR_MERCHANT_KEY` | for billing | PayTR merchant key (HMAC). |
| `PAYTR_MERCHANT_SALT` | for billing | PayTR merchant salt (HMAC). |
| `PAYTR_TEST_MODE` | optional | `1` to use PayTR sandbox; omit/`0` for live. |
| `SMTP_HOST` | for email | SMTP server host (verification + invite mail). |
| `SMTP_PORT` | for email | e.g. `465` (SSL) or `587` (STARTTLS). |
| `SMTP_USER` | for email | SMTP username. |
| `SMTP_PASS` | for email | SMTP password. |
| `SMTP_FROM` | for email | From address, e.g. `LDMCalculator <noreply@ldmcalculator.com>`. |

The system **fails open** for usage metering: if `DATABASE_URL` is unreachable,
legitimate users are not blocked. Billing and email are gated — if PayTR / SMTP
env vars are absent those features are disabled gracefully (`paytrConfigured()`).

---

## 2. Database migration

Provision the SaaS tables (idempotent — safe to re-run):

```bash
DATABASE_URL="postgres://..." node db/migrate-saas.js
```

This runs `db/saas-schema.sql` (users, subscriptions, payments, usage_events,
companies, company_invites, pricing, email_tokens, consents).

Seed default pricing (idempotent — existing rows are left untouched):

```bash
DATABASE_URL="postgres://..." node db/seed-pricing.js
```

Defaults: individual ₺199/mo (yearly ×10 ≈ 2 months free); corporate flat
package per seat tier (3/5/10/20/30/50/100) with a light volume discount;
currencies TRY/USD/EUR; VAT 20% on TRY. **Admin can edit every value afterwards
from the Pricing tab** — the seed is only a placeholder starting point.

(Optional) seed the admin user if not already done:

```bash
DATABASE_URL="postgres://..." node db/seed-admin.js
```

---

## 3. PayTR configuration

1. In the PayTR merchant panel set the **callback / notification URL** to:
   `https://<APP_URL>/api/billing/callback`
2. The callback arrives as `application/x-www-form-urlencoded`. The handler
   verifies the HMAC hash and must reply the literal string `OK` (it does).
3. Recurring payments use `recurring_payment=1` for auto-renew. Amounts are sent
   in kuruş/cents; TRY maps to PayTR currency `TL`.
4. Use `PAYTR_TEST_MODE=1` while integrating, then remove it for live charges.

Flow:
- **Checkout** (`POST /api/billing/checkout`) creates a pending subscription +
  payment, requests a PayTR iframe token, returns `{ iframeUrl }`. The frontend
  redirects the user there.
- **Callback** activates the subscription (sets `current_period_end`) on success,
  or — for `kind='proration'` payments — bumps `companies.seat_count` and the
  subscription tier from `payments.raw.newTier`.

---

## 4. Free-tier limits

- Anonymous (no account): **2 uses/day**.
- Free registered account: **5 uses/day**.
- Paid (active individual or corporate seat): **unlimited**.

A "use" is any tool document or stacking calculation. Anonymous quota is counted
as the UNION of hashed-IP / signed-cookie / hashed-fingerprint, so clearing one
signal does not reset the count.

---

## 5. Build & deploy

```bash
npm install
npm run build      # vite build — validates all pages/imports compile
```

Deploy to Vercel as usual. Each top-level `api/` file is one serverless function;
grouped endpoints use the `api/<group>/[resource].js` dispatcher pattern.

---

## 6. Routes added

Frontend: `/login`, `/register`, `/verify-email`, `/reset-password`,
`/accept-invite`, `/pricing`, `/account` (+ `/account/:tab`),
`/legal/kvkk`, `/legal/explicit-consent`, `/legal/refund-policy`.

Account tabs: Overview, Profile, History (query history), Documents (downloaded
tool docs), Payments, and — for corporate admins — Company (seats, invites,
member management, proration seat upgrades).

Admin tabs added: **Pricing** (edit all price/VAT rows) and **Subscriptions**
(stats: users/companies/active subs, MRR, paid-this-month; plus list/users/payments views).

---

## 7. i18n

All SaaS strings are translated in 6 locales (tr/en/de/ru/fr/ar) under
`src/i18n/locales/`. The merge was applied via `scripts/add-saas-i18n.cjs`
(sections: `legal`, `auth` incl. `auth.err.*`, `paywall`, `pricing`, `account`,
`invite`). English is the fallback for any missing key.
