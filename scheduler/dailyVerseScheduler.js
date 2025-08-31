// scheduler/dailyVerseScheduler.js
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { openReading } = require('../src/db/openReading');
const searchSmart = require('../src/search/searchSmart');
const { idToName } = require('../src/lib/books');

let currentDailyVerse = null;

function setupDailyVerse(client) {
  const configPath = path.join(__dirname, 'dailybread.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const { time, timezone, channelId, translation: configTranslation } = config;

  const defaultTranslation =
    configTranslation || process.env.DEFAULT_TRANSLATION || 'asv';

  const [hour, minute] = time.split(':').map((num) => parseInt(num, 10));

  cron.schedule(
    `${minute} ${hour} * * *`,
    async function () {
      let adapter;
      try {
        adapter = await openReading(defaultTranslation);
        const results = await searchSmart(adapter, 'random', 1);
        const row = results[0];
        if (!row) return;

        const verseText = `${idToName(row.book)} ${row.chapter}:${row.verse} - ${row.text}`;
        currentDailyVerse = verseText;

        const channel = client.channels.cache.get(channelId);
        if (channel) {
          channel.send(verseText);
        } else {
          console.error('Channel not found:', channelId);
        }
      } catch (err) {
        console.error('Error fetching daily verse:', err);
      } finally {
        if (adapter && adapter.close) adapter.close();
      }
    },
    { timezone }
  );
}

function getCurrentDailyVerse() {
  return currentDailyVerse;
}

module.exports = {
  setupDailyVerse,
  getCurrentDailyVerse,
};

