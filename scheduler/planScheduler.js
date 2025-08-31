const cron = require('node-cron');
const moment = require('moment-timezone');
const {
  getAllUserPlans,
  getPlanDef,
  advanceDay,
  deleteUserPlan,
} = require('../src/db/plan');

let task = null;

function setupPlanScheduler(client) {
  if (task) task.stop();
  task = cron.schedule('0 * * * *', async () => {
    let plans;
    try {
      plans = await getAllUserPlans();
    } catch (err) {
      console.error('Failed to load user plans:', err);
      return;
    }
    for (const up of plans) {
      const today = moment().tz(up.timezone).format('YYYY-MM-DD');
      if (up.last_dm === today) continue;
      const def = await getPlanDef(up.plan_id);
      if (!def) continue;
      const dayIndex = up.current_day - 1;
      const user = await client.users.fetch(up.user_id).catch(() => null);
      if (!user) continue;
      if (dayIndex >= def.days.length) {
        await user.send(`Reading plan "${def.name}" complete!`).catch(() => {});
        await deleteUserPlan(up.user_id);
        continue;
      }
      const reading = def.days[dayIndex];
      await user
        .send(`Day ${up.current_day}: ${reading}`)
        .catch(() => {});
      await advanceDay(up.user_id, up.current_day + 1, today);
    }
  });
}

module.exports = { setupPlanScheduler };
