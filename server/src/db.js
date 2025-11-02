const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'data.sqlite3');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    question_count INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    elapsed_seconds REAL NOT NULL,
    time_limit_seconds INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

module.exports = db;
