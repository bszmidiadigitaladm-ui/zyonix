"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, ArrowRight } from "lucide-react";
import Image from "next/image";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { AppFrame } from "@/components/landing/AppFrame";

const TYPING_SPEED_MS = 45;
const HOLD_MS = 1800;
const DELETE_SPEED_MS = 20;

export function Hero() {
  const t = useTranslations("landing.hero");
  const prompts = [t("examplePrompt1"), t("examplePrompt2"), t("examplePrompt3"), t("examplePrompt4")];
  const [promptIndex, setPromptIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting">("typing");

  useEffect(() => {
    const current = prompts[promptIndex % prompts.length];

    if (phase === "typing") {
      if (displayed.length < current.length) {
        const timeout = setTimeout(() => setDisplayed(current.slice(0, displayed.length + 1)), TYPING_SPEED_MS);
        return () => clearTimeout(timeout);
      }
      const timeout = setTimeout(() => setPhase("holding"), HOLD_MS);
      return () => clearTimeout(timeout);
    }

    if (phase === "holding") {
      const timeout = setTimeout(() => setPhase("deleting"), HOLD_MS);
      return () => clearTimeout(timeout);
    }

    // deleting
    if (displayed.length > 0) {
      const timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), DELETE_SPEED_MS);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => {
      setPromptIndex((i) => i + 1);
      setPhase("typing");
    }, DELETE_SPEED_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prompts array identity churns every render (new t() calls); indexing by promptIndex/displayed/phase is all that matters here
  }, [displayed, phase, promptIndex]);

  const chips = [t("chip1"), t("chip2"), t("chip3")];

  // The landing CTAs use plain <a href="#pricing"> instead of next/link: Next skips the
  // navigation when the hash is already current, so after one click the rest stop scrolling.

  return (
    <section className="relative isolate overflow-hidden pt-20 sm:pt-28">
      {/* Ribbon artwork (generated with the same brand palette) fading into the page background. */}
      <Image
        src="/landing/hero-bg.webp"
        alt=""
        fill
        priority
        unoptimized
        sizes="100vw"
        className="-z-20 object-cover object-top opacity-80"
      />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_20%,transparent_0%,var(--background)_80%)]" aria-hidden />
      <div className="absolute left-1/2 top-0 -z-10 h-[28rem] w-[44rem] -translate-x-1/2 rounded-full bg-accent/15 blur-[120px]" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-b from-transparent to-background" aria-hidden />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 text-center">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          {t("titleLine1")}
          <br />
          <span className="bg-[image:var(--gradient-accent)] bg-clip-text text-transparent">{t("titleLine2")}</span>
        </h1>
        <p className="max-w-lg text-balance text-muted">{t("subtitle")}</p>

        <a
          href="#pricing"
          className="mt-2 flex w-full max-w-xl items-center gap-3 rounded-full border border-border bg-surface/90 px-5 py-4 text-left shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_12px_32px_-20px_rgba(0,0,0,0.6)] backdrop-blur transition hover:border-accent/50"
        >
          <Sparkles size={18} className="shrink-0 text-accent" />
          <span className="flex-1 truncate text-sm text-foreground/90">
            {displayed}
            <span className="animate-pulse text-accent">|</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-foreground">
            {t("ctaButton")}
            <ArrowRight size={14} />
          </span>
        </a>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {chips.map((chip) => (
            <a
              key={chip}
              href="#pricing"
              className="rounded-full border border-border bg-surface/60 px-3.5 py-1.5 text-xs text-muted backdrop-blur transition hover:border-accent/50 hover:text-foreground"
            >
              {chip}
            </a>
          ))}
        </div>
      </div>

      {/* Product shot emerging from the fold: real screen, faded at the bottom. */}
      <div className="relative z-10 mx-auto mt-14 max-w-5xl px-6 [mask-image:linear-gradient(to_bottom,black_65%,transparent)]">
        <AppFrame src="/landing/app-art.webp" alt={t("mockupAlt")} priority aspect={2} />
      </div>
    </section>
  );
}
