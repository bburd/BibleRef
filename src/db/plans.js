const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', '..', 'db', 'bot_settings.sqlite');
const planDefsPath = path.join(__dirname, '..', '..', 'plan_defs.json');

function today() {
  return new Date().toISOString().slice(0, 10);
}

function yesterday() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

async function withDb(callback) {
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
  try {
    return await callback(db);
  } finally {
    db.close();
  }
}

// Initialize tables and seed plan definitions
(async () => {
  await withDb((db) => new Promise((resolve) => {
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
          stmt.finalize(() => resolve());
        } catch (err) {
          console.error('Failed to seed plan_defs:', err);
          resolve();
        }
      } else {
        resolve();
      }
    });
  })).catch((err) => console.error('Failed to initialize plan DB:', err));
})();

function getAllPlanDefs() {
  return withDb((db) => new Promise((resolve, reject) => {
    db.all('SELECT id, name, description, days FROM plan_defs', (err, rows) => {
      if (err) reject(err); else resolve(rows.map(r => ({ ...r, days: JSON.parse(r.days) })));
    });
  }));
}

function getPlanDef(id) {
  return withDb((db) => new Promise((resolve, reject) => {
    db.get('SELECT id, name, description, days FROM plan_defs WHERE id = ?', [id], (err, row) => {
      if (err) reject(err); else resolve(row ? { ...row, days: JSON.parse(row.days) } : null);
    });
  }));
}

function startPlan(userId, planId) {
  return withDb((db) => new Promise((resolve, reject) => {
    const sql = `INSERT INTO user_plans (user_id, plan_id, day, streak, last_completed, last_notified)
                 VALUES (?, ?, 0, 0, NULL, NULL)
                 ON CONFLICT(user_id) DO UPDATE SET plan_id=excluded.plan_id, day=0, streak=0, last_completed=NULL, last_notified=NULL`;
    db.run(sql, [userId, planId], (err) => {
      if (err) reject(err); else resolve();
    });
  }));
}

function getUserPlan(userId) {
  return withDb((db) => new Promise((resolve, reject) => {
    db.get('SELECT plan_id, day, streak FROM user_plans WHERE user_id = ?', [userId], (err, row) => {
      if (err) reject(err); else resolve(row);
    });
  }));
}

function stopPlan(userId) {
  return withDb((db) => new Promise((resolve, reject) => {
    db.run('DELETE FROM user_plans WHERE user_id = ?', [userId], function (err) {
      if (err) reject(err); else resolve(this.changes > 0);
    });
  }));
}

function completeDay(userId) {
  return withDb((db) => new Promise((resolve, reject) => {
    db.get('SELECT plan_id, day, streak, last_completed FROM user_plans WHERE user_id = ?', [userId], async (err, row) => {
      if (err) return reject(err);
      if (!row) return reject(new Error('No active plan'));
      let plan;
      try {
        plan = await getPlanDef(row.plan_id);
      } catch (err2) {
        return reject(err2);
      }
      const currentReading = plan.days[row.day];
      if (!currentReading) return reject(new Error('Plan already completed'));
      const todayStr = today();
      const newStreak = row.last_completed === yesterday() ? row.streak + 1 : 1;
      db.serialize(() => {
        db.run(`INSERT OR REPLACE INTO plan_log (user_id, plan_id, day, completed_at) VALUES (?, ?, ?, ?)`, [userId, row.plan_id, row.day, todayStr]);
        db.run(`UPDATE user_plans SET day = ?, streak = ?, last_completed = ? WHERE user_id = ?`, [row.day + 1, newStreak, todayStr, userId], (err2) => {
          if (err2) reject(err2); else {
            const nextReading = plan.days[row.day + 1] || null;
            resolve({ plan, nextReading, streak: newStreak, nextDay: row.day + 1 });
          }
        });
      });
    });
  }));
}

function getAllUserPlans() {
  return withDb((db) => new Promise((resolve, reject) => {
    db.all('SELECT user_id, plan_id, day, streak, last_completed, last_notified FROM user_plans', (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  }));
}

function updateLastNotified(userId, date) {
  return withDb((db) => new Promise((resolve, reject) => {
    db.run('UPDATE user_plans SET last_notified = ? WHERE user_id = ?', [date, userId], (err) => {
      if (err) reject(err); else resolve();
    });
  }));
}

function resetStreak(userId) {
  return withDb((db) => new Promise((resolve, reject) => {
    db.run('UPDATE user_plans SET streak = 0 WHERE user_id = ?', [userId], (err) => {
      if (err) reject(err); else resolve();
    });
  }));
}

module.exports = {
  getAllPlanDefs,
  getPlanDef,
  startPlan,
  completeDay,
  getAllUserPlans,
  updateLastNotified,
  resetStreak,
  getUserPlan,
  stopPlan,
};
