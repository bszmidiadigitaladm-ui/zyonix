"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
      <h1 className="mb-6 text-2xl font-semibold">{t("title")}</h1>

      <div className="mb-6 flex gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("play")}
          className={cn(
            "border-b-2 px-3 py-2 text-sm font-medium transition",
            tab === "play" ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground",
          )}
        >
          {t("tabPlay")}
        </button>
        <button
          type="button"
          onClick={loadLeaderboard}
          className={cn(
            "border-b-2 px-3 py-2 text-sm font-medium transition",
            tab === "leaderboard"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground",
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
            <p className="py-8 text-center text-sm text-muted">{t("noLeaderboardEntries")}</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {leaderboard.map((entry, i) => (
                <li
                  key={`${entry.display_name}-${i}`}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-2 text-sm"
                >
                  <span>
                    <span className="mr-2 font-semibold text-accent">#{i + 1}</span>
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
