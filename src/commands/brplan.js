const { SlashCommandBuilder } = require('discord.js');
const {
  getPlanDef,
  startPlan,
  completeDay,
  getUserPlan,
  stopPlan,
  listPlanDefs,
} = require('../db/plans');
const { ephemeral } = require('../utils/ephemeral');
const { formatDay } = require('../lib/plan-normalize');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('brplan')
    .setDescription('Manage reading plans')
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Start a reading plan')
        .addStringOption((opt) =>
          opt.setName('plan').setDescription('Plan ID').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Show your reading plan status')
    )
    .addSubcommand((sub) =>
      sub.setName('stop').setDescription('Stop the active reading plan')
    )
    .addSubcommand((sub) =>
      sub.setName('complete').setDescription("Mark today's reading as complete")
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    if (sub === 'start') {
      const planId = interaction.options.getString('plan');
      try {
        const plan = await getPlanDef(planId);
        if (!plan) {
          const plans = await listPlanDefs();
          const available = plans.map((p) => p.id).join(', ') || 'none';
          await interaction.reply(
            ephemeral({ content: `Plan not found. Available plans: ${available}` })
          );
          return;
        }
        await startPlan(userId, planId);
        const dayReadings = plan.days[0];
        const title = dayReadings && dayReadings._meta && dayReadings._meta.title;
        const body = `Day 1${title ? `: ${title}` : ':'}\n${formatDay(dayReadings)}`;
        try {
          await interaction.user.send(body);
        } catch (err) {
          console.error('Failed to send DM:', err);
        }
        await interaction.reply(
          ephemeral({
            content: `Started plan **${plan.name}**. Day 1 of ${plan.days.length} sent via DM.`,
          })
        );
      } catch (err) {
        await interaction.reply(
          ephemeral({ content: 'Failed to start plan.' })
        );
      }
    } else if (sub === 'status') {
      try {
        const row = await getUserPlan(userId);
        if (!row) {
          await interaction.reply(
            ephemeral({ content: 'No active plan.' })
          );
          return;
        }
        const plan = await getPlanDef(row.plan_id);
        await interaction.reply(
          ephemeral({
            content: `Reading plan: **${plan.name}**. Day ${row.day + 1} of ${plan.days.length}. Current streak: ${row.streak}.`,
          })
        );
      } catch (err) {
        await interaction.reply(
          ephemeral({ content: 'Failed to get status.' })
        );
      }
    } else if (sub === 'stop') {
      try {
        const removed = await stopPlan(userId);
        if (!removed) {
          await interaction.reply(
            ephemeral({ content: 'No active plan to stop.' })
          );
        } else {
          await interaction.reply(
            ephemeral({ content: 'Stopped the current reading plan.' })
          );
        }
      } catch (err) {
        await interaction.reply(
          ephemeral({ content: 'Failed to stop plan.' })
        );
      }
    } else if (sub === 'complete') {
      try {
        const { plan, nextDayReadings, streak, nextDay } = await completeDay(userId);
        if (nextDayReadings) {
          const title =
            nextDayReadings._meta && nextDayReadings._meta.title;
          const body = `Day ${nextDay + 1}${
            title ? `: ${title}` : ':'
          }\n${formatDay(nextDayReadings)}`;
          try {
            await interaction.user.send(body);
          } catch (err) {
            console.error('Failed to send DM:', err);
          }
        } else {
          try {
            await interaction.user.send('Plan completed!');
          } catch (err) {
            console.error('Failed to send DM:', err);
          }
        }
        await interaction.reply(
          ephemeral({
            content: `Day ${nextDay} of ${plan.days.length} completed. Current streak: ${streak}`,
          })
        );
      } catch (err) {
        await interaction.reply(
          ephemeral({ content: err.message || 'Failed to complete day.' })
        );
      }
    }
  },
};
