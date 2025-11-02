const db = require('./db');

const insertRunStmt = db.prepare(`
  INSERT INTO runs (
    player_name,
    score,
    question_count,
    correct_count,
    elapsed_seconds,
    time_limit_seconds
  ) VALUES (?, ?, ?, ?, ?, ?)
`);

const listRunsStmt = db.prepare(`
  SELECT
    id,
    player_name AS playerName,
    score,
    question_count AS questionCount,
    correct_count AS correctCount,
    elapsed_seconds AS elapsedSeconds,
    time_limit_seconds AS timeLimitSeconds,
    created_at AS createdAt
  FROM runs
  WHERE player_name LIKE ?
  ORDER BY score DESC, elapsed_seconds ASC, created_at ASC
  LIMIT ? OFFSET ?
`);

const countRunsStmt = db.prepare(`
  SELECT COUNT(*) as total
  FROM runs
  WHERE player_name LIKE ?
`);

const getRunByIdStmt = db.prepare(`
  SELECT
    id,
    player_name AS playerName,
    score,
    question_count AS questionCount,
    correct_count AS correctCount,
    elapsed_seconds AS elapsedSeconds,
    time_limit_seconds AS timeLimitSeconds,
    created_at AS createdAt
  FROM runs
  WHERE id = ?
`);

const rankCountStmt = db.prepare(`
  SELECT COUNT(*) as higher
  FROM runs
  WHERE score > @score
     OR (score = @score AND elapsed_seconds < @elapsedSeconds)
     OR (score = @score AND elapsed_seconds = @elapsedSeconds AND datetime(created_at) < datetime(@createdAt))
`);

function saveRun(run) {
  const { playerName, score, questionCount, correctCount, elapsedSeconds, timeLimitSeconds } = run;
  const info = insertRunStmt.run(
    playerName,
    score,
    questionCount,
    correctCount,
    elapsedSeconds,
    timeLimitSeconds,
  );
  return info.lastInsertRowid;
}

function listRuns({ pageSize, page, search }) {
  const offset = (page - 1) * pageSize;
  const likeSearch = `%${search}%`;
  const items = listRunsStmt.all(likeSearch, pageSize, offset);
  const { total } = countRunsStmt.get(likeSearch);
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

function getRunById(runId) {
  return getRunByIdStmt.get(runId);
}

function getRunWithRank(runId) {
  const run = getRunById(runId);
  if (!run) {
    return null;
  }
  const { higher } = rankCountStmt.get({
    score: run.score,
    elapsedSeconds: run.elapsedSeconds,
    createdAt: run.createdAt,
  });
  return {
    run,
    rank: higher, // zero-based ranking
  };
}

module.exports = {
  saveRun,
  listRuns,
  getRunById,
  getRunWithRank,
};
