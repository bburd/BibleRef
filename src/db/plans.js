const path = require('path');
const { open } = require('./conn');
const { pget, pall, prun } = require('./p');

// Path to the persistent settings database
const dbPath = path.join(__dirname, '..', '..', 'db', 'bot_settings.sqlite');

let initPromise;
async function init(db) {
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
}

function withDb(fn) {
  return async (...args) => {
    const db = open(dbPath);
    if (!initPromise) initPromise = init(db);
    await initPromise;
    return fn(db, ...args);
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function yesterday() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

const listPlanDefs = withDb(async (db) => {
  const rows = await pall(db, 'SELECT id, name, description, days FROM plan_defs');
  return rows.map((r) => ({ ...r, days: JSON.parse(r.days) }));
});

const getPlanDef = withDb(async (db, id) => {
  const row = await pget(db, 'SELECT id, name, description, days FROM plan_defs WHERE id = ?', [id]);
  return row ? { ...row, days: JSON.parse(row.days) } : null;
});

const upsertPlanDef = withDb(async (db, id, name, description = '', days = []) => {
  const exists = await pget(db, 'SELECT 1 FROM plan_defs WHERE id = ?', [id]);
  await prun(
    db,
    `INSERT INTO plan_defs (id, name, description, days) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, days=excluded.days`,
    [id, name, description, JSON.stringify(days)]
  );
  return exists ? 'updated' : 'inserted';
});

const startPlan = withDb(async (db, userId, planId) => {
  const sql = `INSERT INTO user_plans (user_id, plan_id, day, streak, last_completed, last_notified)
               VALUES (?, ?, 0, 0, NULL, NULL)
               ON CONFLICT(user_id) DO UPDATE SET plan_id=excluded.plan_id, day=0, streak=0, last_completed=NULL, last_notified=NULL`;
  await prun(db, sql, [userId, planId]);
});

const getUserPlan = withDb(async (db, userId) => {
  return pget(db, 'SELECT plan_id, day, streak FROM user_plans WHERE user_id = ?', [userId]);
});

const stopPlan = withDb(async (db, userId) => {
  const result = await prun(db, 'DELETE FROM user_plans WHERE user_id = ?', [userId]);
  return result.changes > 0;
});

const completeDay = withDb(async (db, userId) => {
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
});

const getAllUserPlans = withDb(async (db) => {
  return pall(
    db,
    'SELECT user_id, plan_id, day, streak, last_completed, last_notified FROM user_plans'
  );
});

const updateLastNotified = withDb(async (db, userId, date) => {
  await prun(db, 'UPDATE user_plans SET last_notified = ? WHERE user_id = ?', [date, userId]);
});

const resetStreak = withDb(async (db, userId) => {
  await prun(db, 'UPDATE user_plans SET streak = 0 WHERE user_id = ?', [userId]);
});

module.exports = {
  upsertPlanDef,
  listPlanDefs,
  getPlanDef,
  startPlan,
  completeDay,
  getAllUserPlans,
  updateLastNotified,
  resetStreak,
  getUserPlan,
  stopPlan,
};

