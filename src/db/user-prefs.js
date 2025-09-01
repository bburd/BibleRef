const path = require('path');
const { open } = require('./conn');
const { pget, prun } = require('./p');

const dbPath = path.join(__dirname, '..', '..', 'db', 'bot_settings.sqlite');
const db = open(dbPath);

const init = (async () => {
  await prun(
    db,
    `CREATE TABLE IF NOT EXISTS user_prefs (
      user_id TEXT PRIMARY KEY,
      translation TEXT NOT NULL CHECK(translation IN ('asv','kjv')),
      updated_at INTEGER
    )`
  );
  await prun(
    db,
    "UPDATE user_prefs SET translation = CASE translation WHEN 'asvs' THEN 'asv' WHEN 'kjv_strongs' THEN 'kjv' ELSE translation END WHERE translation IN ('asvs','kjv_strongs')"
  );
})();

function normalizeTranslation(t) {
  if (!t) return t;
  if (t === 'asvs') return 'asv';
  if (t === 'kjv_strongs') return 'kjv';
  return t;
}

async function getUserTranslation(userId) {
  await init;
  const row = await pget(db, 'SELECT translation FROM user_prefs WHERE user_id = ?', [userId]);
  return row ? normalizeTranslation(row.translation) : null;
}

async function setUserTranslation(userId, translation) {
  await init;
  const now = Date.now();
  const normalized = normalizeTranslation(translation);
  const sql = `INSERT INTO user_prefs (user_id, translation, updated_at)
                 VALUES (?, ?, ?)
                 ON CONFLICT(user_id) DO UPDATE SET translation=excluded.translation, updated_at=excluded.updated_at`;
  await prun(db, sql, [userId, normalized, now]);
}

module.exports = { getUserTranslation, setUserTranslation };
