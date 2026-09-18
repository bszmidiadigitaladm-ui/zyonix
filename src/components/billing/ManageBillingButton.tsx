import { useTranslations } from "next-intl";
import { HOTMART_MANAGE_URL } from "@/lib/config";

// Subscriptions are billed and managed by Hotmart, so this sends the buyer to
// their Hotmart purchases area (cancel, update payment method, invoices)
// instead of an in-app billing portal.
export function ManageBillingButton() {
  const t = useTranslations("billing");

  return (
    <a
      href={HOTMART_MANAGE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground shadow-[0_0_24px_-8px_var(--accent)] transition hover:brightness-110"
    >
      {t("manageBilling")}
    </a>
  );
}
