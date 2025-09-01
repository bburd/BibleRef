const fs = require('fs');
const path = require('path');
const { open } = require('./conn');
const { pget, pall, prun } = require('./p');

const dbPath = path.join(__dirname, '..', '..', 'db', 'bot_settings.sqlite');
const planDefsPath = path.join(__dirname, '..', '..', 'plan_defs.json');
const db = open(dbPath);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function yesterday() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

const init = (async () => {
  await prun(
    db,
    `CREATE TABLE IF NOT EXISTS plan_defs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    days TEXT NOT NULL
  )`
  );
  await prun(
    db,
    `CREATE TABLE IF NOT EXISTS user_plans (
    user_id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    day INTEGER NOT NULL DEFAULT 0,
    streak INTEGER NOT NULL DEFAULT 0,
    last_completed TEXT,
    last_notified TEXT
  )`
  );
  await prun(
    db,
    `CREATE TABLE IF NOT EXISTS plan_log (
    user_id TEXT,
    plan_id TEXT,
    day INTEGER,
    completed_at TEXT,
    PRIMARY KEY(user_id, plan_id, day)
  )`
  );
  if (fs.existsSync(planDefsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(planDefsPath, 'utf8'));
      for (const p of data) {
        await prun(
          db,
          `INSERT OR IGNORE INTO plan_defs (id, name, description, days) VALUES (?, ?, ?, ?)`,
          [p.id, p.name, p.description || '', JSON.stringify(p.days)]
        );
      }
    } catch (err) {
      console.error('Failed to seed plan_defs:', err);
    }
  }
})();

async function getAllPlanDefs() {
  await init;
  const rows = await pall(db, 'SELECT id, name, description, days FROM plan_defs');
  return rows.map((r) => ({ ...r, days: JSON.parse(r.days) }));
}

async function getPlanDef(id) {
  await init;
  const row = await pget(db, 'SELECT id, name, description, days FROM plan_defs WHERE id = ?', [id]);
  return row ? { ...row, days: JSON.parse(row.days) } : null;
}

async function startPlan(userId, planId) {
  await init;
  const sql = `INSERT INTO user_plans (user_id, plan_id, day, streak, last_completed, last_notified)
                 VALUES (?, ?, 0, 0, NULL, NULL)
                 ON CONFLICT(user_id) DO UPDATE SET plan_id=excluded.plan_id, day=0, streak=0, last_completed=NULL, last_notified=NULL`;
  await prun(db, sql, [userId, planId]);
}

async function getUserPlan(userId) {
  await init;
  return pget(db, 'SELECT plan_id, day, streak FROM user_plans WHERE user_id = ?', [userId]);
}

async function stopPlan(userId) {
  await init;
  const result = await prun(db, 'DELETE FROM user_plans WHERE user_id = ?', [userId]);
  return result.changes > 0;
}

async function completeDay(userId) {
  await init;
  const row = await pget(
    db,
    'SELECT plan_id, day, streak, last_completed FROM user_plans WHERE user_id = ?',
    [userId]
  );
  if (!row) throw new Error('No active plan');
  const plan = await getPlanDef(row.plan_id);
  const currentDay = plan.days[row.day];
  if (!currentDay) throw new Error('Plan already completed');
  const todayStr = today();
  const newStreak = row.last_completed === yesterday() ? row.streak + 1 : 1;
  await prun(
    db,
    `INSERT OR REPLACE INTO plan_log (user_id, plan_id, day, completed_at) VALUES (?, ?, ?, ?)`,
    [userId, row.plan_id, row.day, todayStr]
  );
  await prun(
    db,
    `UPDATE user_plans SET day = ?, streak = ?, last_completed = ? WHERE user_id = ?`,
    [row.day + 1, newStreak, todayStr, userId]
  );
  const nextDay = plan.days[row.day + 1] || null;
  return { plan, nextDayReadings: nextDay, streak: newStreak, nextDay: row.day + 1 };
}

async function getAllUserPlans() {
  await init;
  return pall(
    db,
    'SELECT user_id, plan_id, day, streak, last_completed, last_notified FROM user_plans'
  );
}

async function updateLastNotified(userId, date) {
  await init;
  await prun(db, 'UPDATE user_plans SET last_notified = ? WHERE user_id = ?', [date, userId]);
}

async function resetStreak(userId) {
  await init;
  await prun(db, 'UPDATE user_plans SET streak = 0 WHERE user_id = ?', [userId]);
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
