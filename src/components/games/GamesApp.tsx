"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Gamepad2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

interface ClientQuestion {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  options: string[];
}

interface Answer {
  question_id: string;
  selected_index: number;
}

interface LeaderboardEntry {
  display_name: string;
  best_score: number;
}

type Phase = "start" | "loading" | "question" | "submitting" | "results";

export function GamesApp() {
  const t = useTranslations("games");
  const [tab, setTab] = useState<"play" | "leaderboard">("play");
  const [phase, setPhase] = useState<Phase>("start");
  const [questions, setQuestions] = useState<ClientQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [result, setResult] = useState<{ score: number; total_questions: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startQuiz() {
    setError(null);
    setPhase("loading");
    try {
      const res = await fetch("/api/quiz/questions?count=10");
      const data = await res.json();
      if (!res.ok || !data.questions?.length) {
        setError(t("startError"));
        setPhase("start");
        return;
      }
      setQuestions(data.questions);
      setCurrentIndex(0);
      setAnswers([]);
      setPhase("question");
    } catch {
      setError(t("startError"));
      setPhase("start");
    }
  }

  async function selectAnswer(selectedIndex: number) {
    const current = questions[currentIndex];
    const nextAnswers = [...answers, { question_id: current.id, selected_index: selectedIndex }];

    if (currentIndex + 1 < questions.length) {
      setAnswers(nextAnswers);
      setCurrentIndex(currentIndex + 1);
      return;
    }

    setPhase("submitting");
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: nextAnswers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(t("submitError"));
        setPhase("start");
        return;
      }
      setResult({ score: data.session.score, total_questions: data.session.total_questions });
      setPhase("results");
    } catch {
      setError(t("submitError"));
      setPhase("start");
    }
  }

  async function loadLeaderboard() {
    setTab("leaderboard");
    if (leaderboard) return;
    const res = await fetch("/api/quiz/leaderboard");
    const data = await res.json().catch(() => null);
    setLeaderboard(data?.leaderboard ?? []);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader icon={Gamepad2} title={t("title")} />

      <div className="mb-6 inline-flex flex-wrap gap-1 rounded-full border border-border bg-surface p-1">
        <button
          type="button"
          onClick={() => setTab("play")}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition",
            tab === "play" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground",
          )}
        >
          {t("tabPlay")}
        </button>
        <button
          type="button"
          onClick={loadLeaderboard}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition",
            tab === "leaderboard" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground",
          )}
        >
          {t("tabLeaderboard")}
        </button>
      </div>

      {tab === "play" && (
        <>
          {error && <p className="mb-4 text-sm text-danger">{error}</p>}

          {phase === "start" && (
            <Card className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent shadow-[0_0_24px_-10px_var(--accent)]">
                <Gamepad2 size={26} strokeWidth={2} />
              </div>
              <p className="text-sm text-muted">{t("startSubtitle")}</p>
              <Button onClick={startQuiz}>{t("start")}</Button>
            </Card>
          )}

          {phase === "loading" && (
            <Card className="py-12 text-center text-sm text-muted">{t("loadingQuestions")}</Card>
          )}

          {(phase === "question" || phase === "submitting") && questions[currentIndex] && (
            <Card>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-accent">
                {t(`category_${questions[currentIndex].category}`)} · {currentIndex + 1}/{questions.length}
              </p>
              <p className="mb-4 text-lg font-medium">{questions[currentIndex].question}</p>
              <div className="flex flex-col gap-2">
                {questions[currentIndex].options.map((option, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={phase === "submitting"}
                    onClick={() => selectAnswer(i)}
                    className="rounded-lg border border-border px-4 py-3 text-left text-sm hover:border-accent/50 hover:bg-surface-raised disabled:opacity-50"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {phase === "results" && result && (
            <Card className="flex flex-col items-center gap-4 py-12 text-center">
              <Trophy size={28} className="text-accent" strokeWidth={2} />
              <p className="text-3xl font-bold text-accent">
                {result.score}/{result.total_questions}
              </p>
              <p className="text-sm text-muted">{t("resultsSubtitle")}</p>
              <div className="flex gap-3">
                <Button onClick={startQuiz}>{t("playAgain")}</Button>
                <Button variant="secondary" onClick={loadLeaderboard}>
                  {t("tabLeaderboard")}
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      {tab === "leaderboard" && (
        <Card>
          {leaderboard === null ? (
            <p className="py-8 text-center text-sm text-muted">{t("loadingLeaderboard")}</p>
          ) : leaderboard.length === 0 ? (
            <EmptyState icon={Trophy} title={t("noLeaderboardEntries")} />
          ) : (
            <ol className="flex flex-col gap-2">
              {leaderboard.map((entry, i) => (
                <li
                  key={`${entry.display_name}-${i}`}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-4 py-2 text-sm",
                    i === 0
                      ? "border-accent/40 bg-accent-soft/40"
                      : "border-border",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                        i === 0
                          ? "bg-accent text-accent-foreground"
                          : "bg-surface-raised text-muted",
                      )}
                    >
                      {i + 1}
                    </span>
                    {entry.display_name}
                  </span>
                  <span className="font-medium">{entry.best_score}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}
    </div>
  );
}
