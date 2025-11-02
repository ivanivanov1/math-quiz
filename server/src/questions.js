const allPairs = [];

for (let left = 1; left <= 10; left += 1) {
  for (let right = 1; right <= 10; right += 1) {
    allPairs.push({
      id: `${left}x${right}`,
      left,
      right,
    });
  }
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateQuestions(count) {
  if (count < 1 || count > allPairs.length) {
    throw new Error(`Question count must be between 1 and ${allPairs.length}`);
  }

  const shuffled = shuffle(allPairs);
  return shuffled.slice(0, count);
}

function getCorrectAnswer(questionId) {
  const [left, right] = questionId.split('x').map(Number);
  return left * right;
}

module.exports = {
  generateQuestions,
  getCorrectAnswer,
  MAX_QUESTIONS: allPairs.length,
};
