
const { SlashCommandBuilder } = require('discord.js');
const {
  getPlan,
  setUserPlan,
  getUserPlan,
  advanceDay,
  logComplete,
} = require('../db/plans');
const planDefs = require('../../plan_defs.json');

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
        const plan = await getPlan(planId);
        if (!plan) {
          await interaction.reply({ content: 'Plan not found.', ephemeral: true });
          return;
        }
        await setUserPlan(userId, planId);
        const reading = plan.days[0];
        try {
          await interaction.user.send(`Day 1: ${reading}`);
        } catch (err) {
          console.error('Failed to send DM:', err);
        }
        await interaction.reply({
          content: `Started plan **${plan.name}**. First reading sent via DM.`,
          ephemeral: true,
        });
      } catch (err) {
        await interaction.reply({ content: 'Failed to start plan.', ephemeral: true });
      }
    } else if (sub === 'status') {
      try {
        const userPlan = await getUserPlan(userId);
        if (!userPlan) {
          await interaction.reply({ content: 'No active plan.', ephemeral: true });
          return;
        }
        const plan = await getPlan(userPlan.plan_id || userPlan.planId);
        const day = userPlan.day || 0;
        await interaction.reply({
          content: `Reading plan: **${plan.name}**. Day ${day + 1} of ${plan.days.length}. Current streak: ${userPlan.streak || 0}.`,
          ephemeral: true,
        });
      } catch (err) {
        await interaction.reply({ content: 'Failed to get status.', ephemeral: true });
      }
    } else if (sub === 'stop') {
      try {
        const userPlan = await getUserPlan(userId);
        if (!userPlan) {
          await interaction.reply({ content: 'No active plan to stop.', ephemeral: true });
          return;
        }
        await setUserPlan(userId, null);
        await interaction.reply({ content: 'Stopped the current reading plan.', ephemeral: true });
      } catch (err) {
        await interaction.reply({ content: 'Failed to stop plan.', ephemeral: true });
      }
    } else if (sub === 'complete') {
      try {
        const userPlan = await getUserPlan(userId);
        if (!userPlan) {
          await interaction.reply({ content: 'No active plan.', ephemeral: true });
          return;
        }
        const plan = await getPlan(userPlan.plan_id || userPlan.planId);
        await logComplete(userId, plan.id, userPlan.day);
        const { day: nextDay, streak } = await advanceDay(userId);
        const nextReading = plan.days[nextDay];
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
        await interaction.reply({
          content: `Day ${nextDay} completed. Current streak: ${streak}`,
          ephemeral: true,
        });
      } catch (err) {
        await interaction.reply({ content: err.message || 'Failed to complete day.', ephemeral: true });
      }
    }
  },
};
