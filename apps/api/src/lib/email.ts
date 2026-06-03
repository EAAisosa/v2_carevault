import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { config } from "../config";

const ses = new SESClient({ region: config.ses.region });

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  if (config.isDev) {
    // In development, log the email instead of sending it to avoid SES sandbox limits.
    console.log(`[email] To: ${opts.to} | Subject: ${opts.subject}\n${opts.text}`);
    return;
  }

  await ses.send(
    new SendEmailCommand({
      Source: config.ses.fromAddress,
      Destination: { ToAddresses: [opts.to] },
      Message: {
        Subject: { Data: opts.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: opts.html, Charset: "UTF-8" },
          Text: { Data: opts.text, Charset: "UTF-8" },
        },
      },
    }),
  );
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
    text: `Hi ${opts.fullName},\n\n${opts.invitedBy} has invited you to CareVault.\n\nSet your password and activate your account:\n${opts.inviteUrl}\n\nThis link expires in 7 days.`,
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
