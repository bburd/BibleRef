const cron = require('node-cron');
const {
  getAllUserPlans,
  getPlanDef,
  updateLastNotified,
  resetStreak,
} = require('../src/db/plans');

function today() {
  return new Date().toISOString().slice(0, 10);
}

function yesterday() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

let job;

async function checkPlans(client) {
  const plans = await getAllUserPlans();
  const todayStr = today();
  const yest = yesterday();
  for (const p of plans) {
    if (p.last_notified === todayStr) continue;
    const plan = await getPlanDef(p.plan_id);
    const reading = plan.days[p.day];
    if (!reading) continue;
    try {
      const user = await client.users.fetch(p.user_id);
      await user.send(`Day ${p.day + 1}: ${reading}`);
      await updateLastNotified(p.user_id, todayStr);
      if (p.last_completed !== yest) {
        await resetStreak(p.user_id);
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

module.exports = { setupPlanScheduler };