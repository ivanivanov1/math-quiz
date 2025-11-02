const SECONDS_PER_QUESTION = 6;
const POINTS_PER_CORRECT = 10;
const FLOOR_MULTIPLIER = 0.3;
const BONUS_MULTIPLIER = 2;

function computeTimeLimit(questionCount) {
  return questionCount * SECONDS_PER_QUESTION;
}

function computeScore({ questionCount, correctCount, elapsedSeconds }) {
  const basePoints = correctCount * POINTS_PER_CORRECT;
  const floorScore = Math.floor(basePoints * FLOOR_MULTIPLIER);
  const timeLimit = computeTimeLimit(questionCount);
  const madeNoMistakes = correctCount === questionCount;

  if (elapsedSeconds >= timeLimit) {
    return { score: floorScore, basePoints, floorScore, timeLimit, timeBonus: 0 };
  }

  const rawBonus = Math.max(0, Math.floor((timeLimit - elapsedSeconds) * BONUS_MULTIPLIER));
  const timeBonus = madeNoMistakes ? rawBonus : 0;
  const finalScore = Math.max(basePoints + timeBonus, floorScore);

  return { score: finalScore, basePoints, floorScore, timeLimit, timeBonus };
}

module.exports = {
  computeScore,
  computeTimeLimit,
  constants: {
    SECONDS_PER_QUESTION,
    POINTS_PER_CORRECT,
    FLOOR_MULTIPLIER,
    BONUS_MULTIPLIER,
  },
};
