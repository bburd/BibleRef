const test = require('node:test');
const assert = require('node:assert/strict');
const plansDb = require('../src/db/plans');
const { checkPlans } = require('../scheduler/planScheduler');

function yest() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

test('checkPlans formats readings with bullets and metadata', async () => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const dayObj = {
    readings: [
      { book: 1, ranges: [{ chapter: 1 }] },
      { book: 2, ranges: [{ chapter: 3, verses: [16, 17] }] },
    ],
    _meta: { title: 'Start', note: 'Remember to pray' },
  };

  test.mock.method(plansDb, 'getAllUserPlans', async () => [
    { user_id: 'u1', plan_id: 'p1', day: 0, last_notified: null, last_completed: yest() },
  ]);
  test.mock.method(plansDb, 'getPlanDef', async () => ({ days: [dayObj] }));
  const upd = [];
  test.mock.method(plansDb, 'updateLastNotified', async (id, date) => {
    upd.push({ id, date });
  });
  test.mock.method(plansDb, 'resetStreak', async () => {});

  const sent = [];
  const client = {
    users: {
      fetch: async () => ({
        send: async (msg) => {
          sent.push(msg);
        },
      }),
    },
  };

  await checkPlans(client);

  assert.equal(sent.length, 1);
  assert.match(sent[0], /^Day 1: Start/);
  assert.match(sent[0], /• Genesis 1/);
  assert.match(sent[0], /• Exodus 3:16-17/);
  assert.match(sent[0], /Note: Remember to pray/);
  assert.equal(upd.length, 1);
  assert.equal(upd[0].date, todayStr);

  test.mock.reset();
});
