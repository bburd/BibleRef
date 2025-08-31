const cron = require('node-cron');
const { openReading } = require('../src/db/openReading');
const searchSmart = require('../src/search/searchSmart');
const { idToName } = require('../src/lib/books');
const {
  getAllSettings,
} = require('../src/db/guild-settings');

const jobs = new Map();

async function scheduleRow(client, row) {
  const [hour, minute] = row.time.split(':').map((n) => parseInt(n, 10));
  const job = cron.schedule(
    `${minute} ${hour} * * *`,
    async function () {
      let adapter;
      try {
        const translation = process.env.DEFAULT_TRANSLATION || 'asv';
        adapter = await openReading(translation);
        const results = await searchSmart(adapter, 'random', 1);
        const verse = results[0];
        if (!verse) return;
        const text = `${idToName(verse.book)} ${verse.chapter}:${verse.verse} - ${verse.text}`;
        const channel = client.channels.cache.get(row.channel_id);
        if (channel) {
          channel.send(text);
        } else {
          console.error('Channel not found:', row.channel_id);
        }
      } catch (err) {
        console.error('Error fetching daily verse:', err);
      } finally {
        if (adapter && adapter.close) adapter.close();
      }
    },
    { timezone: row.timezone }
  );
  jobs.set(row.guild_id, job);
}

async function setupDailyVerse(client) {
  for (const job of jobs.values()) job.stop();
  jobs.clear();
  const rows = await getAllSettings();
  for (const row of rows) {
    await scheduleRow(client, row);
  }
}

module.exports = { setupDailyVerse };
