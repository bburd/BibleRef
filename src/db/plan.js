const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', '..', 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'bot_settings.sqlite');
const db = new sqlite3.Database(dbPath);

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
    current_day INTEGER NOT NULL,
    timezone TEXT NOT NULL,
    streak INTEGER DEFAULT 0,
    last_completed TEXT,
    last_dm TEXT,
    FOREIGN KEY(plan_id) REFERENCES plan_defs(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS plan_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    day INTEGER NOT NULL,
    completed_at TEXT NOT NULL
  )`);
});

function seedPlanDefs() {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM plan_defs', (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      if (row.count > 0) {
        resolve();
        return;
      }
      const file = path.join(__dirname, '..', '..', 'plan_defs.json');
      fs.readFile(file, 'utf8', (err, data) => {
        if (err) {
          // No seed file; resolve without error
          resolve();
          return;
        }
        let defs;
        try {
          defs = JSON.parse(data);
        } catch (e) {
          console.error('Failed to parse plan_defs.json:', e.message);
          resolve();
          return;
        }
        const stmt = db.prepare('INSERT INTO plan_defs (id, name, description, days) VALUES (?, ?, ?, ?)');
        db.serialize(() => {
          defs.forEach((d) => {
            stmt.run(d.id, d.name, d.description || '', JSON.stringify(d.days || []));
          });
          stmt.finalize(resolve);
        });
      });
    });
  });
}

seedPlanDefs().catch((err) => console.error('Plan defs seed failed:', err));

function getPlanDef(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, name, description, days FROM plan_defs WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else if (row) {
        try {
          row.days = JSON.parse(row.days);
        } catch (e) {
          row.days = [];
        }
        resolve(row);
      } else resolve(null);
    });
  });
}

function getAllPlanDefs() {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, name, description, days FROM plan_defs', (err, rows) => {
      if (err) reject(err);
      else {
        rows = rows || [];
        rows.forEach((r) => {
          try { r.days = JSON.parse(r.days); } catch (e) { r.days = []; }
        });
        resolve(rows);
      }
    });
  });
}

function getAllUserPlans() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM user_plans', (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function getUserPlan(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM user_plans WHERE user_id = ?', [userId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function createUserPlan(userId, planId, timezone) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO user_plans (user_id, plan_id, current_day, timezone, streak, last_completed, last_dm)
       VALUES (?, ?, 1, ?, 0, NULL, NULL)`,
      [userId, planId, timezone],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function advanceDay(userId, nextDay, date) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE user_plans SET current_day = ?, last_dm = ? WHERE user_id = ?',
      [nextDay, date, userId],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function updateCompletion(userId, streak, date) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE user_plans SET streak = ?, last_completed = ? WHERE user_id = ?',
      [streak, date, userId],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function logCompletion(userId, planId, day) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO plan_log (user_id, plan_id, day, completed_at) VALUES (?, ?, ?, ?)',
      [userId, planId, day, new Date().toISOString()],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function deleteUserPlan(userId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM user_plans WHERE user_id = ?', [userId], function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  getPlanDef,
  getAllPlanDefs,
  getAllUserPlans,
  getUserPlan,
  createUserPlan,
  advanceDay,
  updateCompletion,
  logCompletion,
  deleteUserPlan,
};

