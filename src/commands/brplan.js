const { SlashCommandBuilder } = require('discord.js');
const {
  getPlanDef,
  startPlan,
  completeDay,
  getUserPlan,
  stopPlan,
} = require('../db/plans');
const planDefs = require('../../plan_defs.json');
const { ephemeral } = require('../utils/ephemeral');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('brplan')
    .setDescription('Manage reading plans')
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Start a reading plan')
        .addStringOption((opt) => {
          opt.setName('plan').setDescription('Plan ID').setRequired(true);
          planDefs.forEach((p) => opt.addChoices({ name: p.name, value: p.id }));
          return opt;
        })
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
          await interaction.reply(
            ephemeral({ content: 'Plan not found.' })
          );
          return;
        }
        await startPlan(userId, planId);
        const reading = plan.days[0];
        try {
          await interaction.user.send(`Day 1: ${reading}`);
        } catch (err) {
          console.error('Failed to send DM:', err);
        }
        await interaction.reply(
          ephemeral({
            content: `Started plan **${plan.name}**. First reading sent via DM.`,
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
        const { nextReading, streak, nextDay } = await completeDay(userId);
        if (nextReading) {
          try {
            await interaction.user.send(`Day ${nextDay + 1}: ${nextReading}`);
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
            content: `Day ${nextDay} completed. Current streak: ${streak}`,
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
