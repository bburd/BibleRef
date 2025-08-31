const cron = require('node-cron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { getAllDailySettings } = require('../src/db/guild-settings');

const verseDbPath = path.join(__dirname, 'kjv_pure.db');

const tasks = new Map();
const currentDailyVerses = new Map();

function scheduleGuild(client, setting) {
  const { guild_id, channel_id, time, timezone } = setting;
  if (!guild_id || !channel_id || !time || !timezone) return;
  const [hour, minute] = time.split(':').map(Number);

  const task = cron.schedule(
    `${minute} ${hour} * * *`,
    () => {
      const db = new sqlite3.Database(verseDbPath, sqlite3.OPEN_READONLY);
      db.get(
        'SELECT verse_text, book_name FROM kjv_pure ORDER BY RANDOM() LIMIT 1',
        (err, row) => {
          if (err) {
            console.error(err.message);
            db.close();
            return;
          }

          const verse = `${row.book_name}: ${row.verse_text}`;
          currentDailyVerses.set(guild_id, verse);

          const channel = client.channels.cache.get(channel_id);
          if (channel) {
            channel.send(verse);
          } else {
            console.error('Channel not found:', channel_id);
          }
          db.close();
        }
      );
    },
    { timezone }
  );

  tasks.set(guild_id, task);
}

async function setupDailyVerse(client) {
  // clear existing tasks
  for (const task of tasks.values()) {
    task.stop();
  }
  tasks.clear();

  let settings;
  try {
    settings = await getAllDailySettings();
  } catch (err) {
    console.error('Failed to load daily settings:', err);
    return;
  }

  settings.forEach((setting) => scheduleGuild(client, setting));
}

function getCurrentDailyVerse(guildId) {
  return currentDailyVerses.get(guildId);
}

module.exports = {
  setupDailyVerse,
  getCurrentDailyVerse,
};

