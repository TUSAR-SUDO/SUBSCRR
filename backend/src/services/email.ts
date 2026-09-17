import nodemailer, { type Transporter } from 'nodemailer';
import { config, isProduction } from '../config.js';

/**
 * Email transport layer.
 *
 * Provider resolution (first match wins):
 *  1. Resend HTTP API  — RESEND_API_KEY is set (recommended: no SMTP port hassle)
 *  2. SMTP             — SMTP_HOST + SMTP_USER are set (works with any provider)
 *  3. Ethereal         — development only: auto-provisioned test inbox with preview URLs
 *  4. JSON transport   — offline fallback: logs the email instead of sending
 *
 * In production, options 1/2 are expected; falling back to 3/4 logs a loud
 * boot warning so a misconfigured deployment is obvious immediately.
 */

export type EmailTransportMode = 'resend' | 'smtp' | 'ethereal' | 'json';

export function getEmailTransportMode(): EmailTransportMode {
  if (process.env.RESEND_API_KEY?.trim()) return 'resend';
  if (process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim()) return 'smtp';
  if (!isProduction) return 'ethereal';
  return 'json';
}

if (isProduction && getEmailTransportMode() === 'json') {
  console.error(
    '❌ EMAIL NOT CONFIGURED: production is running without RESEND_API_KEY or SMTP credentials. ' +
    'Password-reset and notification emails will NOT be delivered — they will only be logged.'
  );
}

const emailFrom = process.env.EMAIL_FROM?.trim() || 'Subscrr <onboarding@resend.dev>';

// ---------------------------------------------------------------------------
// Transports
// ---------------------------------------------------------------------------

let smtpTransport: Transporter | null = null;

async function getSmtpTransport(): Promise<Transporter> {
  if (smtpTransport) return smtpTransport;
  smtpTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return smtpTransport;
}

let etherealTransport: Transporter | null = null;

async function getEtherealTransport(): Promise<Transporter> {
  if (etherealTransport) return etherealTransport;
  try {
    const testAccount = await nodemailer.createTestAccount();
    etherealTransport = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('📧 Email: Ethereal test inbox ready —', testAccount.user);
  } catch {
    etherealTransport = nodemailer.createTransport({ jsonTransport: true });
    console.log('📧 Email: offline — using local JSON logger fallback');
  }
  return etherealTransport;
}

export interface SendEmailResult {
  success: boolean;
  provider: EmailTransportMode;
  providerMessageId?: string;
  previewUrl?: string;
  error?: string;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Send via whichever transport is configured. Never throws. */
export async function sendEmail(email: OutgoingEmail): Promise<SendEmailResult> {
  const mode = getEmailTransportMode();
  try {
    if (mode === 'resend') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [email.to],
          subject: email.subject,
          html: email.html,
          text: email.text,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!res.ok) {
        return { success: false, provider: mode, error: body.message || `Resend HTTP ${res.status}` };
      }
      return { success: true, provider: mode, providerMessageId: body.id };
    }

    if (mode === 'smtp') {
      const transport = await getSmtpTransport();
      const info = await transport.sendMail({ from: emailFrom, ...email });
      return { success: true, provider: mode, providerMessageId: info.messageId };
    }

    // ethereal (dev) / json (offline + unconfigured production)
    const transport = await getEtherealTransport();
    const info = await transport.sendMail({ from: emailFrom, ...email });
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    if (previewUrl) console.log(`🔗 Email preview: ${previewUrl}`);
    return { success: true, provider: mode, previewUrl };
  } catch (error: any) {
    console.error(`[email] send failed via ${mode}:`, error?.message || error);
    return { success: false, provider: mode, error: error?.message || 'unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Branded templates
// ---------------------------------------------------------------------------

function layout(title: string, bodyHtml: string, footerNote?: string): string {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; color: #111827; border: 1px solid #e5e7eb; border-radius: 12px;">
    <div style="margin-bottom: 24px;">
      <div style="display: inline-block; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #111827;">
        SUBS<span style="color: #FF2500;">CRR</span>
      </div>
    </div>
    <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #111827;">${title}</h2>
    ${bodyHtml}
    <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0 20px;" />
    <p style="font-size: 12px; color: #9ca3af; text-align: center;">
      ${footerNote || 'Subscrr Intelligence Platform • Keeping your recurring subscriptions under total control'}
    </p>
  </div>`;
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display: inline-block; background-color: #FF2500; color: #ffffff; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(255, 37, 0, 0.25);">${label}</a>`;

const paragraph = (text: string) =>
  `<p style="font-size: 15px; line-height: 24px; color: #4b5563; margin-bottom: 24px;">${text}</p>`;

export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<SendEmailResult> {
  const { to, name, resetUrl } = opts;
  const html = layout(
    'Password Reset Request',
    `
    ${paragraph(`Hi ${name || 'there'},<br/><br/>We received a request to reset your password for your Subscrr account. Click the button below to choose a new secure password:`)}
    <div style="margin: 28px 0;">${button(resetUrl, 'Reset Password')}</div>
    ${paragraph('This link will expire in <strong>1 hour</strong>. If you did not request this password reset, please ignore this email or contact support.')}
    <div style="background-color: #f9fafb; border: 1px dashed #d1d5db; border-radius: 6px; padding: 12px; margin-top: 24px; font-family: monospace; font-size: 12px; color: #4b5563; word-break: break-all;">
      Or copy-paste this URL:<br/>${resetUrl}
    </div>`
  );
  return sendEmail({
    to,
    subject: 'Reset your Subscrr password',
    html,
    text: `Hi ${name},\n\nReset your Subscrr password here: ${resetUrl}\n\nThis link expires in 1 hour.`,
  });
}

export async function sendWelcomeEmail(opts: {
  to: string;
  name: string;
  dashboardUrl: string;
}): Promise<SendEmailResult> {
  const { to, name, dashboardUrl } = opts;
  const html = layout(
    'Welcome to Subscrr 🎉',
    `
    ${paragraph(`Hi ${name || 'there'},<br/><br/>Your account is ready. Add your subscriptions once and Subscrr will keep watch: renewal reminders before every charge, trial-expiry warnings, and budget alerts when your monthly spend creeps up.`)}
    <div style="margin: 28px 0;">${button(dashboardUrl, 'Open your dashboard')}</div>
    ${paragraph('Tip: start with the 3–4 subscriptions you are most sure about — the forgotten ones will surface as renewal emails arrive.')}
    ${paragraph('<span style="font-size:13px; color:#6b7280;">You are receiving this because someone created a Subscrr account with this email. If that was not you, you can safely ignore this message.</span>')}`
  );
  return sendEmail({
    to,
    subject: 'Welcome to Subscrr — your subscriptions, under control',
    html,
    text: `Hi ${name},\n\nWelcome to Subscrr! Add your subscriptions and we will remind you before every renewal.\n\nOpen your dashboard: ${dashboardUrl}`,
  });
}

export type AlertEmailKind = 'renewal' | 'trial' | 'budget';

const ALERT_SUBJECTS: Record<AlertEmailKind, string> = {
  renewal: 'Upcoming renewal — Subscrr alert',
  trial: 'Your free trial is ending — Subscrr alert',
  budget: 'Budget threshold reached — Subscrr alert',
};

export async function sendAlertEmail(opts: {
  to: string;
  name: string;
  kind: AlertEmailKind;
  title: string;
  message: string;
  dashboardUrl: string;
}): Promise<SendEmailResult> {
  const { to, name, kind, title, message, dashboardUrl } = opts;
  const accent =
    kind === 'budget' ? '#B45309' : kind === 'trial' ? '#7C3AED' : '#FF2500';
  const html = layout(
    title,
    `
    ${paragraph(`Hi ${name || 'there'},`)}
    <div style="border-left: 4px solid ${accent}; background-color: #f9fafb; border-radius: 0 8px 8px 0; padding: 14px 18px; margin-bottom: 24px;">
      <p style="font-size: 15px; line-height: 24px; color: #111827; margin: 0;">${message}</p>
    </div>
    <div style="margin: 28px 0;">${button(dashboardUrl, 'Review in Subscrr')}</div>
    ${paragraph('<span style="font-size:13px; color:#6b7280;">Manage which emails you receive in Settings → Email Notifications.</span>')}`,
    'You are receiving this alert because you enabled email notifications in Subscrr.'
  );
  return sendEmail({
    to,
    subject: ALERT_SUBJECTS[kind],
    html,
    text: `${title}\n\n${message}\n\nReview in Subscrr: ${dashboardUrl}`,
  });
}
