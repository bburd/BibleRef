const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', '..', 'db', 'bot_settings.sqlite');
const planDefsPath = path.join(__dirname, '..', '..', 'plan_defs.json');

async function seed() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        return reject(err);
      }
    });

    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS plan_defs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        days TEXT NOT NULL
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS user_plans (
        user_id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        day INTEGER NOT NULL DEFAULT 0,
        streak INTEGER NOT NULL DEFAULT 0,
        last_completed TEXT,
        last_notified TEXT
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS plan_log (
        user_id TEXT,
        plan_id TEXT,
        day INTEGER,
        completed_at TEXT,
        PRIMARY KEY(user_id, plan_id, day)
      )`);

      if (fs.existsSync(planDefsPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(planDefsPath, 'utf8'));
          const stmt = db.prepare(`INSERT OR IGNORE INTO plan_defs (id, name, description, days) VALUES (?, ?, ?, ?)`);
          for (const p of data) {
            stmt.run(p.id, p.name, p.description || '', JSON.stringify(p.days));
          }
          stmt.finalize((err) => {
            db.close();
            if (err) return reject(err);
            resolve();
          });
        } catch (err) {
          db.close();
          reject(err);
        }
      } else {
        db.close();
        resolve();
      }
    });
  });
}

module.exports = { seed };
