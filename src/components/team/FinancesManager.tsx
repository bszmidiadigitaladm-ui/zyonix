"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import type { FinancialTransaction } from "@/lib/types/database.types";

const SUGGESTED_CATEGORIES = ["Dízimo", "Oferta", "Doação avulsa", "Contas", "Salários", "Manutenção"];

function isThisMonth(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
}

export function FinancesManager({
  initialTransactions,
  isOwner,
}: {
  initialTransactions: FinancialTransaction[];
  isOwner: boolean;
}) {
  const t = useTranslations("team.finances");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [type, setType] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [occurredOn, setOccurredOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { balance, monthIncome, monthExpense } = useMemo(() => {
    let bal = 0;
    let inc = 0;
    let exp = 0;
    for (const tx of transactions) {
      const signed = tx.type === "income" ? tx.amount_usd : -tx.amount_usd;
      bal += signed;
      if (isThisMonth(tx.occurred_on)) {
        if (tx.type === "income") inc += tx.amount_usd;
        else exp += tx.amount_usd;
      }
    }
    return { balance: bal, monthIncome: inc, monthExpense: exp };
  }, [transactions]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const amountNumber = Number(amount);
    if (!category.trim() || !amountNumber || amountNumber <= 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/church/finances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount_usd: amountNumber,
          category: category.trim(),
          description: description.trim() || undefined,
          occurred_on: occurredOn,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(t("genericError"));
        return;
      }
      setTransactions((prev) =>
        [data.transaction, ...prev].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on)),
      );
      setAmount("");
      setCategory("");
      setDescription("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/church/finances/${id}`, { method: "DELETE" });
    if (res.ok) setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Wallet} value={`$${balance.toFixed(2)}`} label={t("currentBalance")} />
        <StatCard icon={TrendingUp} value={`$${monthIncome.toFixed(2)}`} label={t("monthIncome")} />
        <StatCard icon={TrendingDown} value={`$${monthExpense.toFixed(2)}`} label={t("monthExpense")} />
      </div>

      {isOwner && (
        <Card>
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">{t("type")}</label>
                <Select value={type} onChange={(e) => setType(e.target.value as "income" | "expense")}>
                  <option value="income">{t("income")}</option>
                  <option value="expense">{t("expense")}</option>
                </Select>
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">{t("amount")}</label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("category")}</label>
              <Input
                list="finance-categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={t("categoryPlaceholder")}
              />
              <datalist id="finance-categories">
                {SUGGESTED_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">{t("date")}</label>
                <Input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">{t("description")}</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={submitting} className="self-start">
              {t("add")}
            </Button>
          </form>
        </Card>
      )}

      {transactions.length === 0 ? (
        <EmptyState icon={Wallet} title={t("noTransactions")} />
      ) : (
        <Card className="flex flex-col divide-y divide-border p-0">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <div>
                <p className="font-medium">
                  {tx.category}
                  {tx.description ? ` · ${tx.description}` : ""}
                </p>
                <p className="text-xs text-muted">{tx.occurred_on}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className={cn("font-medium", tx.type === "income" ? "text-accent" : "text-danger")}>
                  {tx.type === "income" ? "+" : "-"}${tx.amount_usd.toFixed(2)}
                </span>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => handleDelete(tx.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted hover:border-danger/50 hover:text-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
