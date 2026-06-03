// Limited-time launch campaign: all paid plans are currently free. While this is
// true the pricing page shows struck-through prices with a "free now" badge, and
// the account/admin panels show subscription amounts as struck-through → 0 so it
// is obvious the user paid nothing. Flip to false when the campaign ends and the
// UI reverts to normal pricing automatically.
//
// NOTE: the backend mirror of this flag lives in
// api/_handlers/admin/subscriptions.js (PROMO_FREE) — keep them in sync.
export const PROMO_FREE = true;
