import { Resend } from "resend";
import { config } from "../config";

const resend = new Resend(config.resendApiKey);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  if (!config.resendApiKey || config.isDev) {
    // In development or when no API key is set, log instead of sending.
    console.log(`[email] To: ${opts.to} | Subject: ${opts.subject}\n${opts.text}`);
    return;
  }

  await resend.emails.send({
    from: config.emailFrom,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}

export function passwordResetEmail(opts: { to: string; resetUrl: string; appUrl: string }) {
  return sendEmail({
    to: opts.to,
    subject: "Reset your CareVault password",
    text: `You requested a password reset.\n\nReset link (expires in 1 hour):\n${opts.resetUrl}\n\nIf you did not request this, ignore this email.`,
    html: `
      <p>You requested a password reset for your CareVault account.</p>
      <p><a href="${opts.resetUrl}" style="background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none">Reset password</a></p>
      <p>This link expires in <strong>1 hour</strong>. If you did not request this, ignore this email.</p>
      <hr/>
      <p style="font-size:12px;color:#6b7280">CareVault — NHRIRP Platform</p>
    `,
  });
}

export function userInviteEmail(opts: { to: string; fullName: string; inviteUrl: string; invitedBy: string }) {
  return sendEmail({
    to: opts.to,
    subject: "You have been invited to CareVault",
    text: `Hi ${opts.fullName},\n\n${opts.invitedBy} has invited you to CareVault.\n\nSet your password:\n${opts.inviteUrl}\n\nThis link expires in 7 days.`,
    html: `
      <p>Hi <strong>${opts.fullName}</strong>,</p>
      <p>${opts.invitedBy} has invited you to the CareVault NHRIRP platform.</p>
      <p><a href="${opts.inviteUrl}" style="background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none">Accept invitation</a></p>
      <p>This link expires in <strong>7 days</strong>.</p>
      <hr/>
      <p style="font-size:12px;color:#6b7280">CareVault — NHRIRP Platform</p>
    `,
  });
}
