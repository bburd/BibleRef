const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { open, closeAll } = require('../src/db/conn');
const { prun } = require('../src/db/p');
const { startPlan, completeDay, getPlanDef, stopPlan, getAllPlanDefs } = require('../src/db/plans');

const dbPath = path.join(__dirname, '..', 'db', 'bot_settings.sqlite');
const db = open(dbPath);

const planId = 'roundtrip-test';
const userId = 'u1';
const days = [
  [{ book: 1, ranges: [{ chapter: 1 }] }],
  [{ book: 1, ranges: [{ chapter: 2 }] }],
];

test('plans DB round-trip with normalized days', async (t) => {
  await getAllPlanDefs();
  await prun(
    db,
    'INSERT OR REPLACE INTO plan_defs (id, name, description, days) VALUES (?, ?, ?, ?)',
    [planId, 'Roundtrip Plan', '', JSON.stringify(days)]
  );

  t.after(async () => {
    await stopPlan(userId);
    await prun(db, 'DELETE FROM plan_defs WHERE id = ?', [planId]);
    await prun(db, 'DELETE FROM plan_log WHERE user_id = ?', [userId]);
    await closeAll();
  });

  await startPlan(userId, planId);

  const plan = await getPlanDef(planId);
  assert.deepEqual(plan.days, days);

  const result = await completeDay(userId);
  assert.deepEqual(result.nextDayReadings, days[1]);
});
