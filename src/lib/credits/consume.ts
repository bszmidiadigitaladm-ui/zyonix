import { createAdminClient } from "@/lib/supabase/admin";
import type { CreditType } from "@/lib/config";

export interface ConsumeResult {
  success: boolean;
  remaining: number;
}

/** Atomic check-and-decrement via the consume_credit Postgres RPC (row-locked, race-safe). */
export async function consumeCredit(
  ownerId: string,
  creditType: CreditType,
  amount = 1,
): Promise<ConsumeResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .rpc("consume_credit", {
      p_owner_id: ownerId,
      p_credit_type: creditType,
      p_amount: amount,
    })
    .single();

  if (error) throw error;
  return data as ConsumeResult;
}

/** Call from a catch block when a generation fails after a credit was already consumed. */
export async function refundCredit(
  ownerId: string,
  creditType: CreditType,
  amount = 1,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("refund_credit", {
    p_owner_id: ownerId,
    p_credit_type: creditType,
    p_amount: amount,
  });
  if (error) throw error;
}
