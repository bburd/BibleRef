const test = require('node:test');
const assert = require('node:assert/strict');
const plansDb = require('../src/db/plans');
const usersDb = require('../src/db/users');

function yest() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

test('checkPlans expands verses and metadata', async () => {
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
  test.mock.method(usersDb, 'getUserTranslation', async () => 'asv');

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

  // require after mocks so scheduler picks them up
  const { checkPlans } = require('../scheduler/planScheduler');

  await checkPlans(client);

  assert.equal(sent.length, 1);
  assert.match(sent[0], /^Day 1: Start/);
  assert.match(sent[0], /• Genesis 1\n  1\. In the beginning/);
  assert.match(sent[0], /• Exodus 3:16–17\n  16\. Go, and gather/);
  assert.match(sent[0], /17\. and I have said/);
  assert.match(sent[0], /Note: Remember to pray/);
  assert.equal(upd.length, 1);
  assert.equal(upd[0].date, todayStr);

  test.mock.reset();
});
