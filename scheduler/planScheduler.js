const cron = require('node-cron');
const plansDb = require('../src/db/plans');
const { formatDayWithText } = require('../src/lib/plan-format-text');
const { getUserTranslation } = require('../src/db/users');

function today() {
  return new Date().toISOString().slice(0, 10);
}

function yesterday() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

let job;

async function checkPlans(client) {
  const plans = await plansDb.getAllUserPlans();
  const todayStr = today();
  const yest = yesterday();
  for (const p of plans) {
    if (p.last_notified === todayStr) continue;
    const plan = await plansDb.getPlanDef(p.plan_id);
    const dayReadings = plan.days[p.day];
    if (!dayReadings) continue;
    try {
      const user = await client.users.fetch(p.user_id);
      const title = dayReadings._meta && dayReadings._meta.title;
      const translation = (await getUserTranslation(p.user_id)) || 'asv';
      const body = await formatDayWithText(dayReadings, translation);
      await user.send(`Day ${p.day + 1}${title ? `: ${title}` : ':'}\n${body}`);
      await plansDb.updateLastNotified(p.user_id, todayStr);
      if (p.last_completed !== yest) {
        await plansDb.resetStreak(p.user_id);
      }
    } catch (err) {
      console.error('Failed to DM reading:', err);
    }
  }
}

function setupPlanScheduler(client) {
  if (job) job.stop();
  job = cron.schedule('0 * * * *', () => {
    checkPlans(client);
  });
}

module.exports = { setupPlanScheduler, checkPlans };
