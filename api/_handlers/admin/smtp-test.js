// TEMPORARY SMTP diagnostic — admin-only. Remove after debugging.
//   GET /api/admin/smtp-test           → config presence + transporter.verify()
//   GET /api/admin/smtp-test?to=a@b.co → also sends a real test email
// Never returns secret VALUES, only whether each var is set (+ non-secret host/port/from).
import nodemailer from 'nodemailer';
import { json, requireAdmin } from '../../_lib/db.js';

export default async function handler(req, res) {
    if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });

    const {
        SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
        SMTP_FROM, APP_URL,
    } = process.env;

    const config = {
        SMTP_HOST_set: !!SMTP_HOST,
        SMTP_HOST: SMTP_HOST || null,              // hostname is not a secret
        SMTP_PORT: SMTP_PORT || null,
        secure_inferred: Number(SMTP_PORT) === 465,
        SMTP_USER_set: !!SMTP_USER,
        SMTP_PASS_set: !!SMTP_PASS,
        SMTP_FROM: SMTP_FROM || '(default)',
        APP_URL: APP_URL || '(default)',
    };

    if (!SMTP_HOST) {
        return json(res, 200, { config, verify: { ok: false, reason: 'SMTP_HOST not set' } });
    }

    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT || 587),
        secure: Number(SMTP_PORT) === 465,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
        tls: { rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED === '1' },
    });

    let verify;
    try {
        await transporter.verify();
        verify = { ok: true };
    } catch (e) {
        verify = { ok: false, error: String(e && e.message || e), code: e && e.code };
    }

    let send;
    const to = (req.query?.to || '').toString().trim();
    if (to) {
        try {
            const info = await transporter.sendMail({
                from: SMTP_FROM || 'LDMCalculator <no-reply@ldmcalculator.com>',
                to,
                subject: 'LDMCalculator SMTP test',
                text: 'SMTP test OK — this confirms outbound email works.',
                html: '<p>SMTP test OK — this confirms outbound email works.</p>',
            });
            send = { ok: true, messageId: info.messageId, response: info.response, accepted: info.accepted, rejected: info.rejected };
        } catch (e) {
            send = { ok: false, error: String(e && e.message || e), code: e && e.code };
        }
    }

    return json(res, 200, { config, verify, ...(send ? { send } : {}) });
}
