export type ScoreBreakdown = {
  score: number;
  basePoints: number;
  floorScore: number;
  timeBonus: number;
  timeLimitSeconds: number;
};

const SECONDS_PER_QUESTION = 6;
const POINTS_PER_CORRECT = 10;
const FLOOR_MULTIPLIER = 0.3;
const BONUS_MULTIPLIER = 2;

export function computePreviewScore(
  questionCount: number,
  correctCount: number,
  elapsedSeconds: number,
): ScoreBreakdown {
  const basePoints = correctCount * POINTS_PER_CORRECT;
  const floorScore = Math.floor(basePoints * FLOOR_MULTIPLIER);
  const timeLimitSeconds = questionCount * SECONDS_PER_QUESTION;
  const madeNoMistakes = correctCount === questionCount;

  if (elapsedSeconds >= timeLimitSeconds) {
    return {
      score: floorScore,
      basePoints,
      floorScore,
      timeBonus: 0,
      timeLimitSeconds,
    };
  }

  const rawBonus = Math.max(0, Math.floor((timeLimitSeconds - elapsedSeconds) * BONUS_MULTIPLIER));
  const timeBonus = madeNoMistakes ? rawBonus : 0;
  const total = Math.max(basePoints + timeBonus, floorScore);

  return {
    score: total,
    basePoints,
    floorScore,
    timeBonus,
    timeLimitSeconds,
  };
}
