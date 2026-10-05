import type { Concept, Quiz } from '../extract/types';
import { hashString, mulberry32, shuffled } from '../palace/rng';
import type { Grade } from '../learn/srs';

export const ANSWER_SEC = 20;
export const WALK_SPEED = 3.4;

export interface ExamQuestion {
  conceptId: string;
  title: string;
  quiz: Quiz;
}

export interface ExamAnswer {
  conceptId: string;
  /** -1 = unanswered (time ran out). */
  chosen: number;
  correct: boolean;
  /** ms from question shown to answered. */
  ms: number;
}

export interface ExamResult {
  correct: number;
  total: number;
  /** 0..100 */
  score: number;
  timeSec: number;
  limitSec: number;
  perConcept: Array<ExamAnswer & { title: string }>;
  /** Wrong first, then slowest. */
  weakest: string[];
}

/** Deterministic per-concept shuffle of the options so the answer isn't always where the author put it. */
export function shuffleQuiz(quiz: Quiz, seed: string): Quiz {
  const rng = mulberry32(hashString(seed));
  const idx = shuffled(
    quiz.options.map((_, i) => i),
    rng,
  );
  return {
    question: quiz.question,
    options: idx.map((i) => quiz.options[i] as string),
    answerIndex: idx.indexOf(quiz.answerIndex),
  };
}

export function buildQuestions(
  route: Array<Pick<Concept, 'id' | 'title' | 'quiz'>>,
  seed: number,
): ExamQuestion[] {
  return route.map((c) => ({
    conceptId: c.id,
    title: c.title,
    quiz: shuffleQuiz(c.quiz, `${seed}:${c.id}`),
  }));
}

/** Total time budget: answer time per question plus the walk along the route. */
export function timeLimitSec(questions: number, routeMeters: number): number {
  return Math.round(questions * ANSWER_SEC + routeMeters / WALK_SPEED + 10);
}

export class ExamSession {
  readonly answers: ExamAnswer[] = [];
  private index = 0;
  private questionShownAt = 0;
  private finishedAt: number | null = null;

  constructor(
    readonly questions: ExamQuestion[],
    readonly limitSec: number,
    public startedAt: number,
  ) {}

  begin(now: number): void {
    this.startedAt = now;
  }

  get current(): ExamQuestion | null {
    return this.finishedAt === null ? (this.questions[this.index] ?? null) : null;
  }

  get position(): number {
    return this.index;
  }

  get finished(): boolean {
    return this.finishedAt !== null;
  }

  timeLeft(now: number): number {
    return Math.max(0, this.limitSec - (now - this.startedAt) / 1000);
  }

  /** Call when the player reaches the object and the question appears. */
  showQuestion(now: number): void {
    this.questionShownAt = now;
  }

  answer(chosen: number, now: number): boolean {
    const q = this.current;
    if (!q) return false;
    const correct = chosen === q.quiz.answerIndex;
    this.answers.push({
      conceptId: q.conceptId,
      chosen,
      correct,
      ms: Math.max(0, now - this.questionShownAt),
    });
    this.index += 1;
    if (this.index >= this.questions.length) this.finishedAt = now;
    return correct;
  }

  /** Time ran out: everything unanswered counts as wrong. */
  expire(now: number): void {
    while (this.index < this.questions.length) {
      const q = this.questions[this.index] as ExamQuestion;
      this.answers.push({ conceptId: q.conceptId, chosen: -1, correct: false, ms: 0 });
      this.index += 1;
    }
    this.finishedAt ??= now;
  }

  result(): ExamResult {
    const end = this.finishedAt ?? this.startedAt;
    const timeSec = Math.max(0, (end - this.startedAt) / 1000);
    const total = this.questions.length;
    const correct = this.answers.filter((a) => a.correct).length;
    const leftFrac = Math.max(0, 1 - timeSec / this.limitSec);
    const acc = total ? correct / total : 0;
    const score = Math.round(100 * (0.88 * acc + 0.12 * acc * leftFrac));
    const titleOf = new Map(this.questions.map((q) => [q.conceptId, q.title]));
    const perConcept = this.answers.map((a) => ({ ...a, title: titleOf.get(a.conceptId) ?? '' }));
    const weakest = [...perConcept]
      .sort((a, b) => Number(a.correct) - Number(b.correct) || b.ms - a.ms)
      .filter((a) => !a.correct || a.ms > 15000)
      .slice(0, 3)
      .map((a) => a.conceptId);
    return { correct, total, score, timeSec, limitSec: this.limitSec, perConcept, weakest };
  }

  /** SM-2 grades: correct+fast = easy, correct = good, wrong/unanswered = again. */
  grades(): Map<string, Grade> {
    const out = new Map<string, Grade>();
    for (const a of this.answers) out.set(a.conceptId, !a.correct ? 'again' : a.ms < 6000 ? 'easy' : 'good');
    return out;
  }

  /** Speed Runner: >= 80% right using at most half the time budget. */
  speedRunner(): boolean {
    const r = this.result();
    return r.total > 0 && r.correct / r.total >= 0.8 && r.timeSec <= r.limitSec / 2;
  }
}
