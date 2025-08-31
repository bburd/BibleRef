const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', '..', 'db', 'bot_settings.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS trivia_scores (
    user_id TEXT PRIMARY KEY,
    username TEXT,
    score INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS trivia_sessions (
    channel_id TEXT PRIMARY KEY,
    data TEXT
  )`);
});

function addScore(userId, username, delta = 1) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO trivia_scores (user_id, username, score)
                 VALUES (?, ?, ?)
                 ON CONFLICT(user_id) DO UPDATE SET
                   username = excluded.username,
                   score = trivia_scores.score + excluded.score`;
    db.run(sql, [userId, username, delta], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function top(limit = 10) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT user_id, username, score FROM trivia_scores
       ORDER BY score DESC LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

function setSession(channelId, session) {
  return new Promise((resolve, reject) => {
    if (!session) {
      db.run(
        `DELETE FROM trivia_sessions WHERE channel_id = ?`,
        [channelId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
      return;
    }
    const data = JSON.stringify(session);
    const sql = `INSERT INTO trivia_sessions (channel_id, data)
                 VALUES (?, ?)
                 ON CONFLICT(channel_id) DO UPDATE SET data = excluded.data`;
    db.run(sql, [channelId, data], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function getSession(channelId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT data FROM trivia_sessions WHERE channel_id = ?`,
      [channelId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? JSON.parse(row.data) : null);
      }
    );
  });
}

function getScore(userId) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT user_id, username, score,
                 (SELECT COUNT(*) + 1 FROM trivia_scores WHERE score > ts.score) AS rank
                 FROM trivia_scores ts WHERE user_id = ?`;
    db.get(sql, [userId], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

module.exports = { addScore, top, setSession, getSession, getScore };
