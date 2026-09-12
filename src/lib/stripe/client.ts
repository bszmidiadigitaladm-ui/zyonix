import Stripe from "stripe";

// Lazily constructed: Next.js imports every API route module at build time to
// collect its config, which would otherwise throw here when STRIPE_SECRET_KEY
// isn't present in the build environment. No explicit apiVersion — defers to
// this SDK version's pinned default so the type-checked request/response
// shapes always match what's actually sent.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return _stripe;
}
