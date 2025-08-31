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

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS daily_settings (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      time TEXT NOT NULL,
      timezone TEXT NOT NULL
    )`
  );
});

function getAllDailySettings() {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT guild_id, channel_id, time, timezone FROM daily_settings',
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

function getDailySettings(guildId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT guild_id, channel_id, time, timezone FROM daily_settings WHERE guild_id = ?',
      [guildId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

function setDailySettings(guildId, channelId, time, timezone) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO daily_settings (guild_id, channel_id, time, timezone)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET channel_id = excluded.channel_id, time = excluded.time, timezone = excluded.timezone`,
      [guildId, channelId, time, timezone],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function deleteDailySettings(guildId) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM daily_settings WHERE guild_id = ?',
      [guildId],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

module.exports = {
  getAllDailySettings,
  getDailySettings,
  setDailySettings,
  deleteDailySettings,
};

