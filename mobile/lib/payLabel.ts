// Pay button copy. The English string is the translation key; Arabic is «ادفع 249 درهمًا»
// (tanween on the alif, Western digits). 498 is the accompanying-spouse price.

/** Western digits, no trailing decimals for a whole amount. */
export const formatPayAmount = (n: number) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

export const PAY_AED = "Pay {amount} AED";

export function payActionCopy(amount: number | null | undefined, currency?: string | null): { title: string; cta: string; vars?: { amount: string } } {
  if (amount == null || !Number.isFinite(Number(amount))) return { title: "Pay securely", cta: "Pay now" };
  const n = formatPayAmount(Number(amount));
  if (!currency || currency === "AED") return { title: PAY_AED, cta: PAY_AED, vars: { amount: n } };
  const title = `Pay ${n} ${currency}`;
  return { title, cta: title };
}
