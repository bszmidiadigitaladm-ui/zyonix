"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

export function CopyCaptionButton({ text, className }: { text: string; className?: string }) {
  const t = useTranslations("posts");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked (e.g. insecure context): the text is still selectable
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={copy} disabled={!text.trim()} className={className}>
      {copied ? t("copied") : t("copyCaption")}
    </Button>
  );
}
