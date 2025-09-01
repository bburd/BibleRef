const path = require('path');
const { open } = require('./conn');
const { pget, pall, prun } = require('./p');

const dbPath = path.join(__dirname, '..', '..', 'db', 'bot_settings.sqlite');
const db = open(dbPath);

const init = (async () => {
  await prun(
    db,
    `CREATE TABLE IF NOT EXISTS trivia_scores (
    user_id TEXT PRIMARY KEY,
    username TEXT,
    score INTEGER DEFAULT 0
  )`
  );
  await prun(
    db,
    `CREATE TABLE IF NOT EXISTS trivia_sessions (
    channel_id TEXT PRIMARY KEY,
    data TEXT
  )`
  );
})();

async function addScore(userId, username, delta = 1) {
  await init;
  const sql = `INSERT INTO trivia_scores (user_id, username, score)
                 VALUES (?, ?, ?)
                 ON CONFLICT(user_id) DO UPDATE SET
                   username = excluded.username,
                   score = trivia_scores.score + excluded.score`;
  await prun(db, sql, [userId, username, delta]);
}

async function top(limit = 10) {
  await init;
  const rows = await pall(
    db,
    `SELECT user_id, username, score FROM trivia_scores
       ORDER BY score DESC LIMIT ?`,
    [limit]
  );
  return rows || [];
}

async function setSession(channelId, session) {
  await init;
  if (!session) {
    await prun(
      db,
      `DELETE FROM trivia_sessions WHERE channel_id = ?`,
      [channelId]
    );
    return;
  }
  const data = JSON.stringify(session);
  const sql = `INSERT INTO trivia_sessions (channel_id, data)
                 VALUES (?, ?)
                 ON CONFLICT(channel_id) DO UPDATE SET data = excluded.data`;
  await prun(db, sql, [channelId, data]);
}

async function getSession(channelId) {
  await init;
  const row = await pget(
    db,
    `SELECT data FROM trivia_sessions WHERE channel_id = ?`,
    [channelId]
  );
  return row ? JSON.parse(row.data) : null;
}

async function getScore(userId) {
  await init;
  const sql = `SELECT user_id, username, score,
                 (SELECT COUNT(*) + 1 FROM trivia_scores WHERE score > ts.score) AS rank
                 FROM trivia_scores ts WHERE user_id = ?`;
  const row = await pget(db, sql, [userId]);
  return row || null;
}

module.exports = { addScore, top, setSession, getSession, getScore };
