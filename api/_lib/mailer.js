// Transactional email via SMTP (nodemailer). Provider-agnostic: point the
// SMTP_* env vars at any provider (SendGrid, Mailgun, Brevo, Gmail, ...).
// If SMTP is not configured the message is logged to the server console so
// local/dev flows still work without throwing.
import nodemailer from 'nodemailer';

const {
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
    SMTP_FROM = 'LDMCalculator <no-reply@ldmcalculator.com>',
    APP_URL = 'https://ldmcalculator.com',
} = process.env;

let _transport = null;
const transport = () => {
    if (!SMTP_HOST) return null;
    if (_transport) return _transport;
    _transport = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT || 587),
        secure: Number(SMTP_PORT) === 465,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
    return _transport;
};

export const appUrl = () => APP_URL.replace(/\/$/, '');

export const sendMail = async ({ to, subject, html, text }) => {
    const t = transport();
    if (!t) {
        console.log('[mailer] SMTP not configured — would send:', { to, subject });
        return { ok: true, skipped: true };
    }
    await t.sendMail({ from: SMTP_FROM, to, subject, html, text: text || stripHtml(html) });
    return { ok: true };
};

const stripHtml = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// --- Branded shell ---------------------------------------------------------
const shell = (title, bodyHtml) => `
<div style="font-family:Arial,Helvetica,sans-serif;background:#0f172a;padding:32px;color:#e2e8f0">
  <div style="max-width:520px;margin:0 auto;background:#111827;border-radius:14px;overflow:hidden;border:1px solid #1f2937">
    <div style="background:#1e293b;padding:20px 28px;font-size:18px;font-weight:bold;color:#fff">LDMCalculator</div>
    <div style="padding:28px">
      <h2 style="margin:0 0 14px;color:#fff;font-size:18px">${title}</h2>
      ${bodyHtml}
    </div>
    <div style="padding:16px 28px;border-top:1px solid #1f2937;font-size:12px;color:#64748b">
      © ${new Date().getFullYear()} LDMCalculator
    </div>
  </div>
</div>`;

const button = (href, label) =>
    `<a href="${href}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold">${label}</a>`;

// --- Specific emails -------------------------------------------------------
export const sendVerificationEmail = (to, token) => {
    const link = `${appUrl()}/verify-email?token=${token}`;
    return sendMail({
        to,
        subject: 'E-postanızı doğrulayın · Verify your email',
        html: shell('E-posta doğrulama / Email verification', `
            <p>Hesabınızı etkinleştirmek için aşağıdaki butona tıklayın. Bağlantı 24 saat geçerlidir.</p>
            <p>Click below to activate your account. The link is valid for 24 hours.</p>
            <p style="margin:22px 0">${button(link, 'Doğrula / Verify')}</p>
            <p style="font-size:12px;color:#94a3b8">${link}</p>`),
    });
};

export const sendPasswordResetEmail = (to, token) => {
    const link = `${appUrl()}/reset-password?token=${token}`;
    return sendMail({
        to,
        subject: 'Parola sıfırlama · Reset your password',
        html: shell('Parola sıfırlama / Password reset', `
            <p>Parolanızı sıfırlamak için butona tıklayın. Bağlantı 1 saat geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı yok sayın.</p>
            <p>Click to reset your password. The link is valid for 1 hour. Ignore this email if you didn't request it.</p>
            <p style="margin:22px 0">${button(link, 'Parolayı sıfırla / Reset')}</p>
            <p style="font-size:12px;color:#94a3b8">${link}</p>`),
    });
};

export const sendCompanyInviteEmail = (to, token, companyName) => {
    const link = `${appUrl()}/accept-invite?token=${token}`;
    return sendMail({
        to,
        subject: `${companyName} sizi davet etti · You've been invited`,
        html: shell('Kurumsal davet / Company invitation', `
            <p><strong>${companyName}</strong> sizi LDMCalculator kurumsal hesabına davet etti. Katılmak için butona tıklayın.</p>
            <p><strong>${companyName}</strong> invited you to their LDMCalculator corporate account. Click to join.</p>
            <p style="margin:22px 0">${button(link, 'Daveti kabul et / Accept')}</p>
            <p style="font-size:12px;color:#94a3b8">${link}</p>`),
    });
};
