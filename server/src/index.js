const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { MAX_QUESTIONS, getCorrectAnswer } = require('./questions');
const { createSession, getSession, deleteSession } = require('./session-store');
const { computeScore } = require('./score');
const { saveRun, listRuns } = require('./runs-repository');

const PORT = process.env.PORT || 4000;
const DEFAULT_QUESTION_COUNT = 10;
const PAGE_SIZE = 20;

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/config', (_req, res) => {
  res.json({
    maxQuestions: MAX_QUESTIONS,
    defaultQuestionCount: DEFAULT_QUESTION_COUNT,
  });
});

app.post('/api/sessions', (req, res) => {
  const requestedCount = Number(req.body?.questionCount ?? DEFAULT_QUESTION_COUNT);

  if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > MAX_QUESTIONS) {
    return res.status(400).json({
      error: `Броят задачи трябва да е цяло число между 1 и ${MAX_QUESTIONS}.`,
    });
  }

  const session = createSession(requestedCount);

  return res.status(201).json({
    sessionId: session.sessionId,
    questions: session.questions,
    timeLimitSeconds: session.timeLimitSeconds,
  });
});

app.post('/api/sessions/:sessionId/complete', (req, res) => {
  const { sessionId } = req.params;
  const session = getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Сесията не е намерена или е изтекла.' });
  }

  const { playerName, answers } = req.body ?? {};

  if (typeof playerName !== 'string' || !playerName.trim()) {
    return res.status(400).json({ error: 'Нужно е да въведеш име.' });
  }

  if (!Array.isArray(answers) || answers.length !== session.questions.length) {
    return res.status(400).json({ error: 'Броят отговори трябва да съвпада с броя задачи.' });
  }

  const trimmedName = playerName.trim();
  const elapsedSeconds = Number(((Date.now() - session.startTime) / 1000).toFixed(2));

  const questionMap = new Map(session.questions.map((q) => [q.id, q]));

  let correctCount = 0;
  for (const response of answers) {
    const question = questionMap.get(response?.questionId);
    if (!question) {
      deleteSession(sessionId);
      return res.status(400).json({ error: 'Невалиден въпрос в списъка с отговори.' });
    }

    const numericAnswer = Number(response.answer);
    if (!Number.isFinite(numericAnswer)) {
      continue;
    }

    if (numericAnswer === getCorrectAnswer(question.id)) {
      correctCount += 1;
    }
  }

  const scoring = computeScore({
    questionCount: session.questions.length,
    correctCount,
    elapsedSeconds,
  });

  saveRun({
    playerName: trimmedName,
    score: scoring.score,
    questionCount: session.questions.length,
    correctCount,
    elapsedSeconds,
    timeLimitSeconds: scoring.timeLimit,
  });

  deleteSession(sessionId);

  return res.status(201).json({
    playerName: trimmedName,
    score: scoring.score,
    basePoints: scoring.basePoints,
    floorScore: scoring.floorScore,
    timeBonus: scoring.timeBonus ?? 0,
    questionCount: session.questions.length,
    correctCount,
    elapsedSeconds,
    timeLimitSeconds: scoring.timeLimit,
  });
});

app.get('/api/leaderboard', (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const search = (req.query.search || '').toString().trim();

  const results = listRuns({
    page,
    pageSize: PAGE_SIZE,
    search,
  });

  return res.json(results);
});

const distDir = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Възникна вътрешна грешка. Опитайте отново.' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});
