const path = require('path');
const { open } = require('./conn');
const { pget, pall, prun } = require('./p');

const dbPath = path.join(__dirname, '..', '..', 'db', 'bot_settings.sqlite');
const db = open(dbPath);

const init = prun(
  db,
  `CREATE TABLE IF NOT EXISTS daily_settings (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT,
    time TEXT,
    timezone TEXT
  )`
);

async function getSettings(guildId) {
  await init;
  const row = await pget(
    db,
    'SELECT guild_id, channel_id, time, timezone FROM daily_settings WHERE guild_id = ?',
    [guildId]
  );
  return row || null;
}

async function getAllSettings() {
  await init;
  const rows = await pall(
    db,
    'SELECT guild_id, channel_id, time, timezone FROM daily_settings'
  );
  return rows || [];
}

async function setSettings(guildId, channelId, time, timezone) {
  await init;
  const sql = `INSERT INTO daily_settings (guild_id, channel_id, time, timezone)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(guild_id) DO UPDATE SET
                   channel_id = excluded.channel_id,
                   time = excluded.time,
                   timezone = excluded.timezone`;
  await prun(db, sql, [guildId, channelId, time, timezone]);
}

async function clearSettings(guildId) {
  await init;
  await prun(db, 'DELETE FROM daily_settings WHERE guild_id = ?', [guildId]);
}

module.exports = {
  getSettings,
  getAllSettings,
  setSettings,
  clearSettings,
};
