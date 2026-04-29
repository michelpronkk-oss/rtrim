import "server-only";
import { Resend } from "resend";

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

export async function sendEarlyAccessConfirmation(email: string): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) return false;

  const body = [
    "Hi,",
    "",
    "You are on the RunTrim Pro early access list.",
    "",
    "RunTrim Free is local-first and does not require an account.",
    "Pro will add hosted project memory, synced run history, continuation prompts, and dashboard visibility across projects.",
    "",
    "For now, you can start locally:",
    "",
    "npm install -g runtrim",
    "runtrim init",
    "runtrim start",
    "",
    "We will reach out when your Pro sync access is ready.",
    "",
    "RunTrim",
  ].join("\n");

  const { error } = await resend.emails.send({
    from: getFromEmail(),
    to: email,
    subject: "You are on the RunTrim Pro early access list",
    text: body,
  });

  return !error;
}

export async function sendEarlyAccessNotification(input: EarlyAccessEmailInput): Promise<boolean> {
  const notifyEmail = process.env.EARLY_ACCESS_NOTIFY_EMAIL?.trim();
  if (!notifyEmail) return false;
  const resend = getResendClient();
  if (!resend) return false;

  const body = [
    "New RunTrim Pro early access request",
    "",
    `email: ${input.email}`,
    `role: ${input.role || "-"}`,
    `agent: ${input.agent || "-"}`,
    `use case: ${input.useCase || "-"}`,
    `source: ${input.source}`,
    `timestamp: ${input.createdAtIso}`,
  ].join("\n");

  const { error } = await resend.emails.send({
    from: getFromEmail(),
    to: notifyEmail,
    subject: "New RunTrim Pro early access request",
    text: body,
  });

  return !error;
}
