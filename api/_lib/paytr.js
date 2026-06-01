// PayTR integration (iFrame API + recurring) — https://www.paytr.com
// All secrets come from env: PAYTR_MERCHANT_ID / PAYTR_MERCHANT_KEY /
// PAYTR_MERCHANT_SALT. PAYTR_TEST_MODE=1 routes to the sandbox.
//
// Flow:
//   1. createIframeToken() → POST to PayTR get-token → returns a token
//      the browser embeds as https://www.paytr.com/odeme/guvenli/<token>
//   2. PayTR POSTs the result to our callback (api/billing/callback) — we
//      verify the hash with verifyCallbackHash() and must reply with "OK".
import crypto from 'node:crypto';

const {
    PAYTR_MERCHANT_ID = '',
    PAYTR_MERCHANT_KEY = '',
    PAYTR_MERCHANT_SALT = '',
    PAYTR_TEST_MODE = '0',
    APP_URL = 'https://ldmcalculator.com',
} = process.env;

export const paytrConfigured = () => !!(PAYTR_MERCHANT_ID && PAYTR_MERCHANT_KEY && PAYTR_MERCHANT_SALT);

const b64 = (buf) => Buffer.from(buf).toString('base64');
const hmac = (data) => crypto.createHmac('sha256', PAYTR_MERCHANT_KEY).update(data).digest();

// PayTR wants the amount in kuruş/cents (integer).
export const toMinorUnits = (amount) => Math.round(Number(amount) * 100);

/**
 * Build & request an iFrame token from PayTR.
 * @returns {Promise<{ok:boolean, token?:string, reason?:string}>}
 */
export async function createIframeToken({
    merchantOid, email, amount, currency = 'TL', userName, userAddress, userPhone,
    userIp, basket, recurring = false, okUrl, failUrl, lang = 'tr',
}) {
    if (!paytrConfigured()) return { ok: false, reason: 'paytr_not_configured' };

    const payment_amount = toMinorUnits(amount);
    // PayTR currency codes: TL | USD | EUR (TRY maps to "TL").
    const cur = currency === 'TRY' ? 'TL' : currency;
    const user_basket = b64(JSON.stringify(basket || [[`LDMCalculator`, String(amount), 1]]));
    const no_installment = '1';
    const max_installment = '0';
    const test_mode = PAYTR_TEST_MODE === '1' ? '1' : '0';

    const hashStr = `${PAYTR_MERCHANT_ID}${userIp}${merchantOid}${email}${payment_amount}${user_basket}${no_installment}${max_installment}${cur}${test_mode}`;
    const paytr_token = b64(hmac(hashStr + PAYTR_MERCHANT_SALT));

    const params = new URLSearchParams({
        merchant_id: PAYTR_MERCHANT_ID,
        user_ip: userIp || '',
        merchant_oid: merchantOid,
        email,
        payment_amount: String(payment_amount),
        paytr_token,
        user_basket,
        debug_on: test_mode,
        no_installment,
        max_installment,
        user_name: userName || 'LDM Customer',
        user_address: userAddress || '-',
        user_phone: userPhone || '-',
        merchant_ok_url: okUrl || `${APP_URL}/account/billing?status=ok`,
        merchant_fail_url: failUrl || `${APP_URL}/account/billing?status=fail`,
        timeout_limit: '30',
        currency: cur,
        test_mode,
        lang: lang === 'tr' ? 'tr' : 'en',
        recurring_payment: recurring ? '1' : '0',
    });

    try {
        const res = await fetch('https://www.paytr.com/odeme/api/get-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });
        const j = await res.json();
        if (j.status === 'success') return { ok: true, token: j.token };
        return { ok: false, reason: j.reason || 'paytr_error' };
    } catch (e) {
        return { ok: false, reason: e.message };
    }
}

// Verify the hash PayTR sends on its server-to-server callback.
export function verifyCallbackHash(body) {
    if (!paytrConfigured()) return false;
    const { merchant_oid, status, total_amount, hash } = body;
    const expected = b64(hmac(`${merchant_oid}${PAYTR_MERCHANT_SALT}${status}${total_amount}`));
    try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(hash || '')));
    } catch {
        return false;
    }
}

// Generate a unique, alphanumeric merchant_oid (PayTR requires alnum only).
export function newMerchantOid(prefix = 'LDM') {
    const rnd = crypto.randomBytes(8).toString('hex');
    return `${prefix}${Date.now()}${rnd}`.replace(/[^a-zA-Z0-9]/g, '');
}
