// scheduler/dailyVerseScheduler.js
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const { scheduleJob } = require("node-schedule");
const sqlite3 = require("sqlite3").verbose();
const dbPath = path.join(__dirname, "..", "kjv_pure.db");

let currentDailyVerse = null;

function setupDailyVerse(client) {
  const configPath = path.join(__dirname, "dailybread.json");
  const { time, timezone, channelId } = JSON.parse(
    fs.readFileSync(configPath, "utf8")
  );

  const [hour, minute] = time.split(":").map((num) => parseInt(num, 10));

  scheduleJob({ hour, minute, tz: timezone }, function () {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        console.error("Error opening database:", err.message);
      } else {
        db.get(
          "SELECT verse_text, book_name FROM kjv_pure ORDER BY RANDOM() LIMIT 1",
          (err, row) => {
            if (err) {
              console.error(err.message);
              return;
            }

            currentDailyVerse = `${row.book_name}: ${row.verse_text}`;

            const channel = client.channels.cache.get(channelId);
            if (channel) {
              channel.send(currentDailyVerse);
            } else {
              console.error("Channel not found:", channelId);
            }
          }
        );
      }
    });
  });
}

function getCurrentDailyVerse() {
  return currentDailyVerse;
}

module.exports = {
  setupDailyVerse,
  getCurrentDailyVerse,
};
