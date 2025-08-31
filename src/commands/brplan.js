const { SlashCommandBuilder } = require('@discordjs/builders');
const moment = require('moment-timezone');
const {
  getPlanDef,
  getUserPlan,
  createUserPlan,
  advanceDay,
  updateCompletion,
  logCompletion,
} = require('../db/plan');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('brplan')
    .setDescription('Manage Bible reading plans')
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Start a reading plan')
        .addStringOption((opt) =>
          opt.setName('plan').setDescription('Plan ID').setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('timezone')
            .setDescription('Your IANA timezone, e.g., America/New_York')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('complete').setDescription("Mark today's reading complete")
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Show your plan status')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (sub === 'start') {
      const planId = interaction.options.getString('plan');
      const timezone = interaction.options.getString('timezone');
      const def = await getPlanDef(planId);
      if (!def) {
        await interaction.reply({
          content: 'Unknown plan.',
          ephemeral: true,
        });
        return;
      }
      await createUserPlan(userId, planId, timezone);
      const today = moment().tz(timezone).format('YYYY-MM-DD');
      const reading = def.days[0];
      await interaction.user
        .send(`Day 1: ${reading}`)
        .catch(() => {});
      await advanceDay(userId, 2, today);
      await interaction.reply({
        content: `Started plan "${def.name}". Check your DMs for day 1!`,
        ephemeral: true,
      });
    } else if (sub === 'complete') {
      const plan = await getUserPlan(userId);
      if (!plan) {
        await interaction.reply({
          content: 'You are not enrolled in a plan.',
          ephemeral: true,
        });
        return;
      }
      const today = moment().tz(plan.timezone).format('YYYY-MM-DD');
      if (plan.last_completed === today) {
        await interaction.reply({
          content: "You've already marked today's reading complete.",
          ephemeral: true,
        });
        return;
      }
      const yesterday = moment(today).subtract(1, 'day').format('YYYY-MM-DD');
      const streak = plan.last_completed === yesterday ? plan.streak + 1 : 1;
      const dayCompleted = plan.current_day - 1;
      await logCompletion(userId, plan.plan_id, dayCompleted);
      await updateCompletion(userId, streak, today);
      await interaction.reply({
        content: `Marked day ${dayCompleted} complete. Current streak: ${streak}.`,
        ephemeral: true,
      });
    } else if (sub === 'status') {
      const plan = await getUserPlan(userId);
      if (!plan) {
        await interaction.reply({
          content: 'You are not enrolled in a plan.',
          ephemeral: true,
        });
        return;
      }
      const def = await getPlanDef(plan.plan_id);
      const day = plan.current_day - 1;
      await interaction.reply({
        content: `Plan: ${def?.name || plan.plan_id}\nDay: ${day}\nStreak: ${plan.streak}`,
        ephemeral: true,
      });
    }
  },
};
