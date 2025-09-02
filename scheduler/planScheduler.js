const cron = require('node-cron');
const plansDb = require('../src/db/plans');
const { formatDay } = require('../src/lib/plan-normalize');

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
      let body = `Day ${p.day + 1}${title ? `: ${title}` : ':'}\n${formatDay(dayReadings)}`;
      if (dayReadings._meta) {
        const meta = { ...dayReadings._meta };
        delete meta.title;
        if (meta.note) {
          body += `\nNote: ${meta.note}`;
          delete meta.note;
        }
        for (const [k, v] of Object.entries(meta)) {
          body += `\n${k}: ${v}`;
        }
      }
      await user.send(body);
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
