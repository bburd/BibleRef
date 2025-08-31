const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', '..', 'db', 'bot_settings.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS daily_settings (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT,
    time TEXT,
    timezone TEXT
  )`);
});

function getSettings(guildId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT guild_id, channel_id, time, timezone FROM daily_settings WHERE guild_id = ?',
      [guildId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

function getAllSettings() {
  return new Promise((resolve, reject) => {
    db.all('SELECT guild_id, channel_id, time, timezone FROM daily_settings', (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function setSettings(guildId, channelId, time, timezone) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO daily_settings (guild_id, channel_id, time, timezone)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(guild_id) DO UPDATE SET
                   channel_id = excluded.channel_id,
                   time = excluded.time,
                   timezone = excluded.timezone`;
    db.run(sql, [guildId, channelId, time, timezone], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function clearSettings(guildId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM daily_settings WHERE guild_id = ?', [guildId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  getSettings,
  getAllSettings,
  setSettings,
  clearSettings,
};
