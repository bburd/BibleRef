const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', '..', 'db', 'bot_settings.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS user_prefs (
    user_id TEXT PRIMARY KEY,
    translation TEXT CHECK(translation IN ('asv','kjv')),
    updated_at INTEGER
  )`);

  // One-time migration to normalize legacy translation values
  db.run(
    "UPDATE user_prefs SET translation = CASE translation WHEN 'asvs' THEN 'asv' WHEN 'kjv_strongs' THEN 'kjv' ELSE translation END WHERE translation IN ('asvs','kjv_strongs')"
  );
});

function normalizeTranslation(t) {
  if (!t) return t;
  if (t === 'asvs') return 'asv';
  if (t === 'kjv_strongs') return 'kjv';
  return t;
}

function getUserTranslation(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT translation FROM user_prefs WHERE user_id = ?', [userId], (err, row) => {
      if (err) reject(err);
      else resolve(row ? normalizeTranslation(row.translation) : null);
    });
  });
}

function setUserTranslation(userId, translation) {
  const now = Date.now();
  const normalized = normalizeTranslation(translation);
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO user_prefs (user_id, translation, updated_at)
                 VALUES (?, ?, ?)
                 ON CONFLICT(user_id) DO UPDATE SET translation=excluded.translation, updated_at=excluded.updated_at`;
    db.run(sql, [userId, normalized, now], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = { getUserTranslation, setUserTranslation };
