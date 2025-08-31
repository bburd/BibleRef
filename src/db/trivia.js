const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure the database directory exists
const dbDir = path.join(__dirname, '..', '..', 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'bot_settings.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize tables
 db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS trivia_scores (
      user_id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0
    )`);
  db.run(`CREATE TABLE IF NOT EXISTS trivia_sessions (
      guild_id TEXT PRIMARY KEY,
      session TEXT
    )`);
 });

function addScore(userId, username, correct) {
  return new Promise((resolve, reject) => {
    if (correct) {
      db.run(
        `INSERT INTO trivia_scores (user_id, username, score, streak)
         VALUES (?, ?, 1, 1)
         ON CONFLICT(user_id) DO UPDATE SET
           username = excluded.username,
           score = trivia_scores.score + 1,
           streak = trivia_scores.streak + 1`,
        [userId, username],
        function (err) {
          if (err) reject(err); else resolve();
        }
      );
    } else {
      db.run(
        `INSERT INTO trivia_scores (user_id, username, score, streak)
         VALUES (?, ?, 0, 0)
         ON CONFLICT(user_id) DO UPDATE SET
           username = excluded.username,
           streak = 0`,
        [userId, username],
        function (err) {
          if (err) reject(err); else resolve();
        }
      );
    }
  });
}

function top(limit = 10) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT user_id, username, score, streak FROM trivia_scores
       ORDER BY score DESC LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) reject(err); else resolve(rows || []);
      }
    );
  });
}

function setSession(guildId, session) {
  return new Promise((resolve, reject) => {
    if (session) {
      db.run(
        `INSERT INTO trivia_sessions (guild_id, session)
         VALUES (?, ?)
         ON CONFLICT(guild_id) DO UPDATE SET session = excluded.session`,
        [guildId, JSON.stringify(session)],
        function (err) {
          if (err) reject(err); else resolve();
        }
      );
    } else {
      db.run(
        `DELETE FROM trivia_sessions WHERE guild_id = ?`,
        [guildId],
        function (err) {
          if (err) reject(err); else resolve();
        }
      );
    }
  });
}

function getSession(guildId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT session FROM trivia_sessions WHERE guild_id = ?`,
      [guildId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? JSON.parse(row.session) : null);
      }
    );
  });
}

function getScore(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT user_id, username, score, streak FROM trivia_scores WHERE user_id = ?`,
      [userId],
      (err, row) => {
        if (err) reject(err); else resolve(row || null);
      }
    );
  });
}

function getRank(userId) {
  return new Promise((resolve, reject) => {
    const query = `SELECT COUNT(*) + 1 AS rank FROM trivia_scores WHERE score > (SELECT score FROM trivia_scores WHERE user_id = ?)`;
    db.get(query, [userId], (err, row) => {
      if (err) reject(err); else resolve(row ? row.rank : null);
    });
  });
}

module.exports = {
  addScore,
  top,
  setSession,
  getSession,
  getScore,
  getRank,
};
