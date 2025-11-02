import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  completeSession,
  createSession,
  fetchLeaderboard,
  type AnswerPayload,
  type CompleteSessionResponse,
  type LeaderboardResponse,
  type Question,
} from '@/services/api';
import { computePreviewScore } from '@/utils/scoring';

type Stage = 'home' | 'quiz' | 'summary' | 'review' | 'leaderboard';

type SummaryStats = {
  questionCount: number;
  correctCount: number;
  elapsedSeconds: number;
  timeLimitSeconds: number;
};

const MAX_QUESTIONS = 100;

const formatNumber = (value: number, fractionDigits = 0) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0.0s';
  return `${formatNumber(seconds, 1)}s`;
};

function countCorrect(questions: Question[], answers: AnswerPayload[]) {
  const lookup = new Map(questions.map((question) => [question.id, question]));
  return answers.reduce((acc, answer) => {
    const question = lookup.get(answer.questionId);
    if (!question) return acc;
    return acc + (question.left * question.right === answer.answer ? 1 : 0);
  }, 0);
}

function LeaderboardView({
  data,
  loading,
  error,
  page,
  onPageChange,
  searchInput,
  onSearchInputChange,
  onApplySearch,
  onResetSearch,
  onRefresh,
  highlightedRunId,
  onGoHome,
}: {
  data: LeaderboardResponse | null;
  loading: boolean;
  error: string | null;
  page: number;
  onPageChange: (nextPage: number) => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onApplySearch: () => void;
  onResetSearch: () => void;
  onRefresh: () => void;
  highlightedRunId: number | null;
  onGoHome: () => void;
}) {
  const totalPages = data?.totalPages ?? 0;
  const items = data?.items ?? [];
  const highlightedRowRef = useRef<HTMLTableRowElement | null>(null);

  highlightedRowRef.current = null;

  useEffect(() => {
    if (!highlightedRunId) return;
    const el = highlightedRowRef.current;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedRunId, data]);

  return (
    <Card className="w-full max-w-4xl bg-white/80 shadow-2xl shadow-primary/20 backdrop-blur min-w-[340px]">
      <CardHeader className="sm:flex sm:items-center sm:justify-between">
        <div className="space-y-2">
          <CardTitle>Класация на смелите умножители</CardTitle>
          <CardDescription>
            Разгледай всички записани приключения. Филтрирай по име и виж кой е най-бърз.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="mt-4 inline-flex items-center gap-1 text-primary hover:bg-primary/10 sm:mt-0"
          onClick={onGoHome}
        >
          ← Към началото
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="leaderboard-search">Търси по име</Label>
            <Input
              id="leaderboard-search"
              placeholder="напр. Алекс"
              value={searchInput}
              onChange={(event) => onSearchInputChange(event.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={onApplySearch} disabled={loading}>
              Търси
            </Button>
            <Button type="button" variant="ghost" onClick={onResetSearch} disabled={loading}>
              Изчисти
            </Button>
            <Button type="button" variant="outline" onClick={onRefresh} disabled={loading}>
              Опресни
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border bg-white/70">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="w-24 px-2 py-2 font-semibold">Име</th>
                <th className="w-20 px-2 py-2 font-semibold text-right">Точки</th>
                <th className="w-24 px-2 py-2 font-semibold text-right">Верни</th>
                <th className="w-24 px-2 py-2 font-semibold text-right">Време</th>
                <th className="w-32 px-2 py-2 font-semibold text-right">Дата</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    Зареждам класацията…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    {error ?? 'Все още няма записи. Изиграй един рунд!'}
                  </td>
                </tr>
              ) : (
                items.map((run) => {
                  const isHighlighted = run.id === highlightedRunId;
                  return (
                    <tr
                      key={run.id}
                      data-run-id={run.id}
                      ref={isHighlighted ? (el) => { highlightedRowRef.current = el; } : undefined}
                      className={`border-t border-border/60 transition-colors ${
                        isHighlighted ? 'bg-primary/10' : 'bg-white/0'
                      }`}
                    >
                      <td className="max-w-[7rem] px-3 py-3 font-medium whitespace-normal break-words">
                        {isHighlighted ? '⭐ ' : ''}
                        {run.playerName}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-primary">{run.score}</td>
                      <td className="px-3 py-3 text-right">
                        {run.correctCount}/{run.questionCount}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {formatDuration(run.elapsedSeconds)}
                      </td>
                      <td className="px-3 py-3 text-right text-muted-foreground">
                        {new Intl.DateTimeFormat('bg-BG', {
                          month: 'short',
                          day: 'numeric',
                          year: '2-digit',
                          hour: 'numeric',
                          minute: '2-digit',
                        }).format(new Date(run.createdAt))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">
          Общо {data?.total ?? 0} приключения • {totalPages || 1} страници
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={loading || page <= 1}
          >
            Назад
          </Button>
          <span className="text-sm font-medium">
            Страница {page}
            {totalPages > 0 ? ` от ${totalPages}` : ''}
          </span>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => onPageChange(totalPages ? Math.min(totalPages, page + 1) : page + 1)}
            disabled={loading || (totalPages > 0 && page >= totalPages)}
          >
            Напред
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function App() {
  const [stage, setStage] = useState<Stage>('home');
  const [questionCountInput, setQuestionCountInput] = useState('10');
  const [session, setSession] = useState<{
    sessionId: string;
    questions: Question[];
    timeLimitSeconds: number;
  } | null>(null);
  const [quizStartedAt, setQuizStartedAt] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [answers, setAnswers] = useState<AnswerPayload[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [result, setResult] = useState<CompleteSessionResponse | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null);
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [leaderboardSearchInput, setLeaderboardSearchInput] = useState('');
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [leaderboardReloadVersion, setLeaderboardReloadVersion] = useState(0);
  const [highlightedRunId, setHighlightedRunId] = useState<number | null>(null);
  const [reviewData, setReviewData] = useState<{ questions: Question[]; answers: AnswerPayload[] } | null>(null);
  const answerInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let timerId: number | null = null;
    if (stage === 'quiz' && quizStartedAt !== null) {
      timerId = window.setInterval(() => {
        setElapsedSeconds(Number(((Date.now() - quizStartedAt) / 1000).toFixed(1)));
      }, 100);
    }
    return () => {
      if (timerId !== null) {
        window.clearInterval(timerId);
      }
    };
  }, [stage, quizStartedAt]);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLeaderboardLoading(true);
      setLeaderboardError(null);
      try {
        const data = await fetchLeaderboard(leaderboardPage, leaderboardSearch);
        setLeaderboardData(data);
      } catch (err) {
        setLeaderboardError(err instanceof Error ? err.message : 'Не успях да заредя класацията.');
      } finally {
        setLeaderboardLoading(false);
      }
    };
    loadLeaderboard();
  }, [leaderboardPage, leaderboardSearch, leaderboardReloadVersion]);

  const parsedQuestionCount = Number(questionCountInput);
  const isQuestionCountValid =
    Number.isInteger(parsedQuestionCount) &&
    parsedQuestionCount >= 1 &&
    parsedQuestionCount <= MAX_QUESTIONS;

  const currentQuestion = session?.questions[currentIndex] ?? null;
  const remainingAfterThis = session ? Math.max(session.questions.length - currentIndex - 1, 0) : 0;

  const localCorrectCount = useMemo(() => {
    if (!session) return summaryStats?.correctCount ?? 0;
    return countCorrect(session.questions, answers);
  }, [session, answers, summaryStats]);

  const previewScore = useMemo(() => {
    if (!summaryStats) return null;
    return computePreviewScore(
      summaryStats.questionCount,
      summaryStats.correctCount,
      summaryStats.elapsedSeconds,
    );
  }, [summaryStats]);

  const scoreDetails = result ?? previewScore;
  const reviewAnswerMap = useMemo(() => {
    if (!reviewData) return null;
    return new Map(reviewData.answers.map((entry) => [entry.questionId, entry]));
  }, [reviewData]);

  const handleStartSession = async () => {
    const numericTarget = Number(questionCountInput);
    if (!Number.isFinite(numericTarget)) {
      setError('Въведи число между 1 и 100.');
      return;
    }

    const requestedCount = Math.max(1, Math.min(MAX_QUESTIONS, Math.round(numericTarget)));
    if (!Number.isInteger(requestedCount)) {
      setError('Въведи число между 1 и 100.');
      return;
    }

    setQuestionCountInput(String(requestedCount));
    setHighlightedRunId(null);
    setReviewData(null);
    setLoading(true);
    setError(null);
    setResult(null);
    setSummaryStats(null);
    try {
      const response = await createSession(requestedCount);
      setSession(response);
      setStage('quiz');
      setQuizStartedAt(Date.now());
      setCurrentIndex(0);
      setAnswers([]);
      setCurrentAnswer('');
      setElapsedSeconds(0);
      setPlayerName('');
      requestAnimationFrame(() => {
        answerInputRef.current?.focus();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не успях да стартирам играта.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = () => {
    if (!session || !currentQuestion) return;
    const trimmed = currentAnswer.trim();
    if (trimmed.length === 0) {
      setError('Моля, въведи отговор, преди да продължиш.');
      return;
    }

    const numericAnswer = Number(trimmed);
    if (!Number.isFinite(numericAnswer)) {
      setError('Отговорите трябва да са числа.');
      return;
    }

    const updatedAnswers = [
      ...answers,
      { questionId: currentQuestion.id, answer: Math.round(numericAnswer) },
    ];
    setAnswers(updatedAnswers);
    setCurrentAnswer('');
    setError(null);

    if (currentIndex + 1 >= session.questions.length) {
      const elapsed = quizStartedAt ? Number(((Date.now() - quizStartedAt) / 1000).toFixed(1)) : elapsedSeconds;
      setElapsedSeconds(elapsed);
      setReviewData({
        questions: session.questions,
        answers: updatedAnswers,
      });
      setSummaryStats({
        questionCount: session.questions.length,
        correctCount: countCorrect(session.questions, updatedAnswers),
        elapsedSeconds: elapsed,
        timeLimitSeconds: session.timeLimitSeconds,
      });
      setStage('summary');
    } else {
      setCurrentIndex((prev) => prev + 1);
      requestAnimationFrame(() => {
        answerInputRef.current?.focus();
      });
    }
  };

  const handleCompleteSession = async () => {
    if (!session || !summaryStats) return;
    const trimmedName = playerName.trim();
    if (trimmedName.length === 0) {
      setSaveError('Моля, въведи име, за да запазим резултата.');
      return;
    }

    setSaveError(null);
    setSaving(true);
    try {
      const completion = await completeSession(session.sessionId, {
        playerName: trimmedName,
        answers,
        elapsedSeconds: summaryStats.elapsedSeconds,
      });
      setResult(completion);
      setSession(null);
      setQuizStartedAt(null);
      setAnswers([]);
      setHighlightedRunId(completion.runId);
      setLeaderboardPage(completion.page);
      setLeaderboardReloadVersion((value) => value + 1);
      setStage('leaderboard');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Не успях да запазя резултата.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStage('home');
    setSession(null);
    setQuizStartedAt(null);
    setCurrentIndex(0);
    setCurrentAnswer('');
    setAnswers([]);
    setElapsedSeconds(0);
    setSummaryStats(null);
    setResult(null);
    setError(null);
    setSaveError(null);
    setPlayerName('');
    setHighlightedRunId(null);
    setQuestionCountInput('10');
    setReviewData(null);
  };

  const handleLeaderboardApplySearch = () => {
    setLeaderboardPage(1);
    setLeaderboardSearch(leaderboardSearchInput.trim());
  };

  const handleLeaderboardResetSearch = () => {
    setLeaderboardSearchInput('');
    setLeaderboardPage(1);
    setLeaderboardSearch('');
  };

  useEffect(() => {
    const keyListener = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        if (stage === 'quiz') {
          event.preventDefault();
          handleAnswerSubmit();
        } else if (stage === 'home') {
          event.preventDefault();
          handleStartSession();
        }
      }
    };

    window.addEventListener('keydown', keyListener);
    return () => window.removeEventListener('keydown', keyListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, currentAnswer, session, currentIndex, quizStartedAt, answers, questionCountInput]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-sky-100 via-rose-100 to-amber-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-10 top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[18rem] w-[18rem] -translate-y-1/4 translate-x-1/4 rounded-full bg-secondary/30 blur-3xl" />
      </div>

      {stage === 'home' && (
        <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-12 px-6 py-12 text-center">
          <div className="space-y-6">
            <h1 className="text-3xl font-semibold uppercase tracking-[0.3em] text-primary/80">
              Весела математика
            </h1>
            <h1 className="text-3xl font-bold leading-tight text-slate-900 md:text-5xl">
              Превърни умножението в цветно приключение!
            </h1>
            <p className="mx-auto max-w-2xl text-md text-slate-700">
              Задай колко задачи искаш, натисни старт и се впусни в състезание срещу часовника. Всеки рунд е различен,
              защото задачите се разбъркват наново.
            </p>
          </div>

          <div className="home-card rounded-3xl bg-white/80 p-8 shadow-2xl shadow-primary/20 backdrop-blur md:mx-auto">
            <div className="space-y-4 text-left">
              <div>
                <Label htmlFor="question-count" className="text-base">
                  Колко задачки искаш?
                </Label>
                <Input
                  id="question-count"
                  type="number"
                  min={1}
                  max={MAX_QUESTIONS}
                  value={questionCountInput}
                  onChange={(event) => {
                    const raw = event.target.value;
                    if (raw === '') {
                      setQuestionCountInput('');
                      return;
                    }
                    const numericValue = Number(raw);
                    if (Number.isNaN(numericValue)) {
                      return;
                    }
                    setQuestionCountInput(raw);
                  }}
                  onBlur={() => {
                    if (questionCountInput === '') {
                      setQuestionCountInput('1');
                      return;
                    }
                    const numericValue = Number(questionCountInput);
                    if (!Number.isFinite(numericValue)) {
                      setQuestionCountInput('1');
                      return;
                    }
                    const clamped = Math.max(1, Math.min(MAX_QUESTIONS, Math.round(numericValue)));
                    setQuestionCountInput(String(clamped));
                  }}
                  className="mt-2 h-12 text-lg"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  Бонус бързина, ако приключиш до {isQuestionCountValid ? parsedQuestionCount * 6 : '…'} секунди.
                </p>
              </div>
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              <Button
                type="button"
                onClick={handleStartSession}
                disabled={loading}
                className="h-12 w-full rounded-full text-lg font-semibold"
              >
                {loading ? 'Подготвям играта…' : 'Старт!'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-12 w-full rounded-full text-lg font-semibold text-primary hover:bg-primary/10"
                onClick={() => setStage('leaderboard')}
              >
                Виж класацията
              </Button>
            </div>
          </div>
        </div>
      )}

      {stage === 'quiz' && session && currentQuestion && (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12 text-white">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-amber-400 opacity-90" />
          <div className="absolute left-6 top-6">
            <Button
              type="button"
              variant="ghost"
              className="bg-white/20 text-white hover:bg-white/30"
              onClick={handleReset}
            >
              ← Към началото
            </Button>
          </div>
          <div className="relative z-10 flex flex-col items-center gap-10 text-center">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.4em] text-white/80">
                Задача {currentIndex + 1} от {session.questions.length}
              </p>
              <p className="text-2xl font-semibold drop-shadow">
                ⏱ {formatDuration(elapsedSeconds)} / {formatDuration(session.timeLimitSeconds)}
              </p>
              <p className="text-lg text-white/90">
                Остават още {remainingAfterThis} {remainingAfterThis === 1 ? 'задачка' : 'задачки'}
              </p>
            </div>
            <h2 className="text-6xl font-black uppercase tracking-tight drop-shadow-lg md:text-8xl">
              {currentQuestion.left} × {currentQuestion.right}
            </h2>
            <div className="flex flex-col items-center gap-4">
              <Input
                id="answer"
                type="number"
                inputMode="numeric"
                value={currentAnswer}
                onChange={(event) => setCurrentAnswer(event.target.value)}
                className="h-16 w-44 rounded-full border-4 border-white bg-white/90 text-center text-3xl font-bold text-slate-900 shadow-xl focus-visible:ring-white"
                ref={answerInputRef}
              />
              <Button
                type="button"
                size="lg"
                className="h-16 rounded-full bg-white/90 px-10 text-2xl font-semibold text-primary hover:bg-white"
                onClick={handleAnswerSubmit}
              >
                Готово
              </Button>
              {error && <p className="max-w-sm text-base font-semibold text-amber-200 drop-shadow">{error}</p>}
              <p className="text-sm text-white/80">
                Верни досега: {localCorrectCount}
              </p>
            </div>
          </div>
        </div>
      )}

      {stage === 'summary' && summaryStats && (
        <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-16">
          <Card className="relative w-full max-w-2xl bg-white/85 shadow-2xl shadow-primary/30 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-primary">Страхотно приключение!</CardTitle>
              <CardDescription className="text-base text-slate-600">
                Реши {summaryStats.questionCount} задачки за {formatDuration(summaryStats.elapsedSeconds)}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border bg-primary/10 p-5">
                  <p className="text-sm text-muted-foreground">Верни отговори</p>
                  <p className="mt-2 text-3xl font-semibold text-primary">
                    {summaryStats.correctCount} / {summaryStats.questionCount}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={() => setStage('review')}
                    disabled={!reviewData}
                  >
                    Провери отговорите
                  </Button>
                </div>
                <div className="rounded-2xl border bg-secondary/10 p-5">
                  <p className="text-sm text-muted-foreground">Изминало време</p>
                  <p className="mt-2 text-3xl font-semibold">
                    {formatDuration(summaryStats.elapsedSeconds)}
                  </p>
                </div>
              </div>
              {scoreDetails && (
                <div className="rounded-2xl border bg-accent/10 p-5">
                  <p className="text-sm text-muted-foreground">
                    Точки за този рунд:
                  </p>
                  <p className="mt-2 text-4xl font-bold text-secondary-foreground">
                    {scoreDetails.score} т.{' '}
                    <span className="text-base font-medium text-muted-foreground">
                      ({scoreDetails.timeBonus} точки бонус за време)
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {scoreDetails.timeBonus > 0
                      ? 'Браво! Победи часовника!'
                      : summaryStats.correctCount === summaryStats.questionCount
                        ? 'Следващия път опитай да приключиш по-бързо, за да грабнеш бонуса.'
                        : 'Имаш няколко грешки - опитай отново и бонусът ще те чака!'}
                  </p>
                </div>
              )}
              {result ? (
                <div className="rounded-2xl border bg-muted/40 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-secondary-foreground/80">
                    Резултатът е запазен!
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Вече можеш да го видиш в класацията или да започнеш ново приключение.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="player-name">Как се казва шампионът?</Label>
                    <Input
                      id="player-name"
                      value={playerName}
                      onChange={(event) => setPlayerName(event.target.value)}
                      placeholder="Въведи име"
                      className="mt-2"
                    />
                  </div>
                  {saveError && <p className="text-sm font-medium text-destructive">{saveError}</p>}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-wrap justify-between">
              <Button type="button" onClick={handleCompleteSession} disabled={saving}>
                {saving ? 'Записвам…' : 'Запази резултата'}
              </Button>
              <Button type="button" variant="outline" onClick={handleReset}>
                Към началото
              </Button>
              <Button type="button" variant="ghost" onClick={() => setStage('leaderboard')}>
                Виж класацията
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {stage === 'leaderboard' && (
        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-10 px-6 py-16 text-center">
          <LeaderboardView
            data={leaderboardData}
            loading={leaderboardLoading}
            error={leaderboardError}
            page={leaderboardPage}
            onPageChange={setLeaderboardPage}
            searchInput={leaderboardSearchInput}
            onSearchInputChange={setLeaderboardSearchInput}
            onApplySearch={handleLeaderboardApplySearch}
            onResetSearch={handleLeaderboardResetSearch}
            onRefresh={() => setLeaderboardReloadVersion((value) => value + 1)}
            highlightedRunId={highlightedRunId}
            onGoHome={() => {
              setHighlightedRunId(null);
              setStage('home');
            }}
          />
        </div>
      )}

      {stage === 'review' && reviewData && summaryStats && (
        <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-8 px-6 py-16">
          <Card className="w-full bg-white/85 shadow-2xl shadow-secondary/30 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-secondary-foreground">
                Провери отговорите
              </CardTitle>
              <CardDescription>
                {summaryStats.questionCount} задачки • {summaryStats.correctCount} верни •{' '}
                {formatDuration(summaryStats.elapsedSeconds)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reviewData.questions.map((question) => {
                const answerRecord = reviewAnswerMap?.get(question.id);
                const userAnswer =
                  answerRecord && Number.isFinite(Number(answerRecord.answer))
                    ? Number(answerRecord.answer)
                    : null;
                const correctAnswer = question.left * question.right;
                const isCorrect = userAnswer === correctAnswer;

                return (
                  <div
                    key={question.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-lg ${
                      isCorrect
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-rose-200 bg-rose-50 text-rose-700'
                    }`}
                  >
                    <span className="font-display font-semibold">
                      {question.left} × {question.right} ={' '}
                      <span className="font-bold">
                        {userAnswer !== null ? userAnswer : '—'}
                      </span>
                    </span>
                    {!isCorrect && (
                      <span className="text-sm font-medium text-rose-600">
                        Правилен отговор: {correctAnswer}
                      </span>
                    )}
                  </div>
                );
              })}
            </CardContent>
            <CardFooter className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStage('summary')}
              >
                Назад към обобщението
              </Button>
              <Button type="button" variant="ghost" onClick={() => setStage('leaderboard')}>
                Виж класацията
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

export default App;
