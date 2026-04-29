import "server-only";
import { Resend } from "resend";
import { RUNTRIM_ICON_PATH } from "@/lib/branding";

type EarlyAccessEmailInput = {
  email: string;
  role?: string;
  agent?: string;
  useCase?: string;
  source: string;
  createdAtIso: string;
};

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getFromEmail(): string {
  return process.env.EARLY_ACCESS_FROM_EMAIL?.trim() || "RunTrim <hello@runtrim.com>";
}

function getSiteUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.runtrim.com";
  return siteUrl.replace(/\/+$/, "");
}

function getLogoUrl(): string {
  return `${getSiteUrl()}${RUNTRIM_ICON_PATH}`;
}

// ─── Shared design tokens (inlined for email clients) ────────────────────────
const C = {
  bg:        "#07071A",
  card:      "#0D0C22",
  cardBorder:"rgba(255,255,255,0.09)",
  accent:    "#7C6DFA",
  accentDim: "rgba(124,109,250,0.12)",
  text:      "#EDEEFF",
  muted:     "#7F8CAA",
  dimmer:    "#4A5270",
  code:      "#090A1F",
  codeBorder:"rgba(255,255,255,0.07)",
  ok:        "#4DE8B0",
  divider:   "rgba(255,255,255,0.07)",
  fontSans:  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  fontMono:  "'SFMono-Regular','SF Mono','Fira Code',Consolas,'Liberation Mono',Menlo,monospace",
};

function emailShell(content: string): string {
  const logoUrl = getLogoUrl();
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>RunTrim</title>
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${C.bg};font-family:${C.fontSans};-webkit-text-size-adjust:100%;mso-line-height-rule:exactly;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${C.bg};min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px 56px;">
        <!-- Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">

          <!-- Wordmark header -->
          <tr>
            <td style="padding-bottom:32px;" align="left">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="width:32px;height:32px;vertical-align:middle;">
                    <img src="${logoUrl}" alt="RunTrim" width="32" height="32" style="display:block;border:0;border-radius:6px;outline:none;text-decoration:none;" />
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="font-family:${C.fontSans};font-size:15px;font-weight:700;color:${C.text};letter-spacing:-0.3px;">RunTrim</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:${C.card};border:1px solid ${C.cardBorder};border-radius:12px;overflow:hidden;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:28px;text-align:center;">
              <p style="margin:0;font-family:${C.fontSans};font-size:11px;color:${C.dimmer};line-height:1.7;">
                RunTrim &bull; Local-first AI run control &bull; No source code uploaded<br/>
                <a href="https://www.runtrim.com/privacy" style="color:${C.dimmer};text-decoration:underline;">Privacy</a>
                &nbsp;&middot;&nbsp;
                <a href="https://www.runtrim.com/terms" style="color:${C.dimmer};text-decoration:underline;">Terms</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Confirmation email HTML ──────────────────────────────────────────────────
function buildConfirmationHtml(): string {
  const content = `
    <!-- Top accent bar -->
    <tr>
      <td style="height:3px;background:linear-gradient(90deg,${C.accent},#9966FF,#5B8BFF);border-radius:12px 12px 0 0;"></td>
    </tr>

    <!-- Body padding -->
    <tr>
      <td style="padding:36px 36px 0;">

        <!-- Badge -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
          <tr>
            <td style="background-color:${C.accentDim};border:1px solid rgba(124,109,250,0.22);border-radius:20px;padding:5px 12px;">
              <span style="font-family:${C.fontMono};font-size:10px;font-weight:600;color:${C.accent};letter-spacing:0.12em;text-transform:uppercase;">Early Access Confirmed</span>
            </td>
          </tr>
        </table>

        <!-- Heading -->
        <h1 style="margin:0 0 12px;font-family:${C.fontSans};font-size:28px;font-weight:700;color:${C.text};letter-spacing:-0.04em;line-height:1.1;">
          You're on the list.
        </h1>
        <p style="margin:0 0 28px;font-family:${C.fontSans};font-size:15px;color:${C.muted};line-height:1.7;">
          We'll reach out when your Pro sync access is ready. In the meantime, RunTrim Free is fully functional locally with no account required.
        </p>

        <!-- Divider -->
        <div style="height:1px;background-color:${C.divider};margin-bottom:28px;"></div>

        <!-- Get started section -->
        <p style="margin:0 0 14px;font-family:${C.fontMono};font-size:10px;font-weight:600;color:${C.dimmer};letter-spacing:0.14em;text-transform:uppercase;">Get started now</p>

        <!-- Command 1 -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:6px;">
          <tr>
            <td style="background-color:${C.code};border:1px solid ${C.codeBorder};border-radius:8px;padding:10px 14px;">
              <span style="font-family:${C.fontMono};font-size:13px;color:rgba(124,109,250,0.55);">$&nbsp;</span><span style="font-family:${C.fontMono};font-size:13px;color:#C4B8FF;">npm install -g runtrim</span>
            </td>
          </tr>
        </table>
        <!-- Command 2 -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:6px;">
          <tr>
            <td style="background-color:${C.code};border:1px solid ${C.codeBorder};border-radius:8px;padding:10px 14px;">
              <span style="font-family:${C.fontMono};font-size:13px;color:rgba(124,109,250,0.55);">$&nbsp;</span><span style="font-family:${C.fontMono};font-size:13px;color:#C4B8FF;">runtrim start</span>
            </td>
          </tr>
        </table>
        <p style="margin:8px 0 28px;font-family:${C.fontSans};font-size:12px;color:${C.dimmer};">
          Works in any repo. Initializes on first run.
        </p>

        <!-- Divider -->
        <div style="height:1px;background-color:${C.divider};margin-bottom:28px;"></div>

        <!-- What Pro adds -->
        <p style="margin:0 0 16px;font-family:${C.fontMono};font-size:10px;font-weight:600;color:${C.dimmer};letter-spacing:0.14em;text-transform:uppercase;">What Pro adds</p>

        <!-- Feature 1 -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:12px;">
          <tr>
            <td style="width:16px;vertical-align:top;padding-top:2px;">
              <div style="width:6px;height:6px;background-color:${C.accent};border-radius:50%;"></div>
            </td>
            <td style="padding-left:8px;">
              <p style="margin:0;font-family:${C.fontSans};font-size:13px;color:${C.text};font-weight:600;">Synced project memory</p>
              <p style="margin:2px 0 0;font-family:${C.fontSans};font-size:12px;color:${C.muted};line-height:1.6;">Run history, context, and continuation prompts available across machines.</p>
            </td>
          </tr>
        </table>
        <!-- Feature 2 -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:12px;">
          <tr>
            <td style="width:16px;vertical-align:top;padding-top:2px;">
              <div style="width:6px;height:6px;background-color:${C.accent};border-radius:50%;"></div>
            </td>
            <td style="padding-left:8px;">
              <p style="margin:0;font-family:${C.fontSans};font-size:13px;color:${C.text};font-weight:600;">Hosted run dashboard</p>
              <p style="margin:2px 0 0;font-family:${C.fontSans};font-size:12px;color:${C.muted};line-height:1.6;">Full timeline of every run with risk scores, changed files, and next safe actions.</p>
            </td>
          </tr>
        </table>
        <!-- Feature 3 -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:0;">
          <tr>
            <td style="width:16px;vertical-align:top;padding-top:2px;">
              <div style="width:6px;height:6px;background-color:${C.accent};border-radius:50%;"></div>
            </td>
            <td style="padding-left:8px;">
              <p style="margin:0;font-family:${C.fontSans};font-size:13px;color:${C.text};font-weight:600;">Savings visibility</p>
              <p style="margin:2px 0 0;font-family:${C.fontSans};font-size:12px;color:${C.muted};line-height:1.6;">Estimated tokens and cost avoided per project, tracked over time.</p>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <!-- Bottom padding + CTA -->
    <tr>
      <td style="padding:32px 36px 36px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background-color:${C.accent};border-radius:8px;padding:0;">
              <a href="https://www.runtrim.com/app/install" target="_blank"
                 style="display:inline-block;font-family:${C.fontSans};font-size:13px;font-weight:700;color:${C.bg};text-decoration:none;padding:11px 22px;border-radius:8px;letter-spacing:-0.01em;">
                View install guide &rarr;
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-family:${C.fontSans};font-size:12px;color:${C.dimmer};line-height:1.6;">
          Questions? Reply to this email or reach us at <a href="mailto:hello@runtrim.com" style="color:${C.muted};text-decoration:underline;">hello@runtrim.com</a>
        </p>
      </td>
    </tr>
  `;

  return emailShell(content);
}

// ─── Admin notification HTML ──────────────────────────────────────────────────
function buildNotificationHtml(input: EarlyAccessEmailInput): string {
  const rows: Array<[string, string]> = [
    ["Email",     input.email],
    ["Role",      input.role      || "—"],
    ["Agent",     input.agent     || "—"],
    ["Use case",  input.useCase   || "—"],
    ["Source",    input.source],
    ["Timestamp", new Date(input.createdAtIso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })],
  ];

  const tableRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding:9px 14px;font-family:${C.fontMono};font-size:11px;color:${C.dimmer};white-space:nowrap;border-bottom:1px solid ${C.divider};vertical-align:top;width:110px;">${label}</td>
      <td style="padding:9px 14px;font-family:${C.fontSans};font-size:13px;color:${C.text};border-bottom:1px solid ${C.divider};word-break:break-all;">${value}</td>
    </tr>
  `).join("");

  const content = `
    <!-- Top accent bar -->
    <tr>
      <td style="height:3px;background:linear-gradient(90deg,${C.accent},#9966FF,#5B8BFF);border-radius:12px 12px 0 0;"></td>
    </tr>
    <tr>
      <td style="padding:28px 28px 0;">
        <p style="margin:0 0 6px;font-family:${C.fontMono};font-size:10px;font-weight:600;color:${C.dimmer};letter-spacing:0.14em;text-transform:uppercase;">New submission</p>
        <h2 style="margin:0 0 20px;font-family:${C.fontSans};font-size:20px;font-weight:700;color:${C.text};letter-spacing:-0.03em;">Early access request</h2>
        <div style="height:1px;background-color:${C.divider};margin-bottom:0;"></div>
      </td>
    </tr>
    <tr>
      <td style="padding:0 0 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${tableRows}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 28px 28px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background-color:${C.accent};border-radius:8px;">
              <a href="https://supabase.com/dashboard" target="_blank"
                 style="display:inline-block;font-family:${C.fontSans};font-size:12px;font-weight:700;color:${C.bg};text-decoration:none;padding:9px 18px;border-radius:8px;">
                Open Supabase &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  return emailShell(content);
}

// ─── Plain text fallbacks ─────────────────────────────────────────────────────
function buildConfirmationText(): string {
  return [
    "You're on the RunTrim Pro early access list.",
    "",
    "RunTrim Free is local-first and works without an account.",
    "Pro adds synced project memory, hosted run history, and dashboard visibility.",
    "",
    "Get started now:",
    "",
    "  npm install -g runtrim",
    "  runtrim start",
    "",
    "We'll reach out when your Pro sync access is ready.",
    "",
    "Questions? hello@runtrim.com",
    "",
    "— RunTrim",
    "https://www.runtrim.com",
  ].join("\n");
}

function buildNotificationText(input: EarlyAccessEmailInput): string {
  return [
    "New RunTrim Pro early access request",
    "",
    `email:      ${input.email}`,
    `role:       ${input.role      || "—"}`,
    `agent:      ${input.agent     || "—"}`,
    `use case:   ${input.useCase   || "—"}`,
    `source:     ${input.source}`,
    `timestamp:  ${input.createdAtIso}`,
  ].join("\n");
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function sendEarlyAccessConfirmation(email: string): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) return false;

  const { error } = await resend.emails.send({
    from:    getFromEmail(),
    to:      email,
    subject: "You're on the RunTrim early access list",
    html:    buildConfirmationHtml(),
    text:    buildConfirmationText(),
  });

  return !error;
}

export async function sendEarlyAccessNotification(input: EarlyAccessEmailInput): Promise<boolean> {
  const notifyEmail = process.env.EARLY_ACCESS_NOTIFY_EMAIL?.trim();
  if (!notifyEmail) return false;
  const resend = getResendClient();
  if (!resend) return false;

  const { error } = await resend.emails.send({
    from:    getFromEmail(),
    to:      notifyEmail,
    subject: `New early access: ${input.email}`,
    html:    buildNotificationHtml(input),
    text:    buildNotificationText(input),
  });

  return !error;
}
