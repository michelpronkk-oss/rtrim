/**
 * UI-only billing CTA helpers. Pure functions, no side effects.
 * Never import payment provider logic here.
 * Consumed by client components (ProCheckoutButton) and server pages (billing, dashboard).
 */

/**
 * Returns true only if the signed-in user has never activated a paid subscription
 * and is therefore eligible for the 3-day Pro trial.
 *
 * Rules:
 * - Must be on the Free plan (effective plan, after entitlement check)
 * - Must have no payment_subscription_id (never subscribed)
 * - plan_status must not indicate a prior or failed subscription
 */
export function trialEligible(opts: {
  plan: string;
  planStatus: string | null;
  paymentSubscriptionId: string | null;
}): boolean {
  const { plan, planStatus, paymentSubscriptionId } = opts;
  if (plan !== "free") return false;
  // Any prior subscription disqualifies the trial
  if (paymentSubscriptionId) return false;
  const status = (planStatus ?? "").toLowerCase();
  // Canceled/expired statuses mean a prior subscription existed
  if (status === "canceled" || status === "cancelled" || status === "expired") return false;
  return true;
}

/** Billing states that require payment recovery before new checkout flows. */
export function needsPaymentUpdate(planStatus: string | null): boolean {
  const status = (planStatus ?? "").toLowerCase();
  return status === "past_due" || status === "payment_failed" || status === "incomplete";
}
