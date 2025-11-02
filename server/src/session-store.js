const { randomUUID } = require('crypto');
const { generateQuestions } = require('./questions');
const { computeTimeLimit } = require('./score');

const sessions = new Map();

function createSession(questionCount) {
  const sessionId = randomUUID();
  const questions = generateQuestions(questionCount);
  const startTime = Date.now();
  const timeLimitSeconds = computeTimeLimit(questionCount);

  sessions.set(sessionId, {
    sessionId,
    questions,
    startTime,
    timeLimitSeconds,
  });

  return {
    sessionId,
    questions,
    timeLimitSeconds,
    startedAt: startTime,
  };
}

function getSession(sessionId) {
  return sessions.get(sessionId);
}

function deleteSession(sessionId) {
  sessions.delete(sessionId);
}

// Basic cleanup to avoid leaking sessions if not completed.
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

setInterval(() => {
  const now = Date.now();
  sessions.forEach((session, sessionId) => {
    if (now - session.startTime > SESSION_TIMEOUT_MS) {
      sessions.delete(sessionId);
    }
  });
}, 15 * 60 * 1000).unref();

module.exports = {
  createSession,
  getSession,
  deleteSession,
};
