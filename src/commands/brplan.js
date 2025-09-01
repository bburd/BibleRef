const { SlashCommandBuilder } = require('discord.js');
const { startPlan, completeDay, getPlanDef, updateLastNotified } = require('../db/plans');
const planDefs = require('../../plan_defs.json');

function today() {
  return new Date().toISOString().slice(0, 10);
}

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
      sub.setName('complete').setDescription("Mark today's reading as complete")
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    if (sub === 'start') {
      const planId = interaction.options.getString('plan');
      try {
        await startPlan(userId, planId);
        const plan = await getPlanDef(planId);
        const reading = plan.days[0];
        try {
          await interaction.user.send(`Day 1: ${reading}`);
          await updateLastNotified(userId, today());
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
    } else if (sub === 'complete') {
      try {
        const res = await completeDay(userId);
        if (res.nextReading) {
          try {
            await interaction.user.send(`Day ${res.nextDay}: ${res.nextReading}`);
            await updateLastNotified(userId, today());
          } catch (err) {
            console.error('Failed to send DM:', err);
          }
        } else {
          try {
            await interaction.user.send('Plan completed!');
            await updateLastNotified(userId, today());
          } catch (err) {
            console.error('Failed to send DM:', err);
          }
        }
        await interaction.reply({
          content: `Day ${res.nextDay - 1} completed. Current streak: ${res.streak}`,
          ephemeral: true,
        });
      } catch (err) {
        await interaction.reply({ content: err.message, ephemeral: true });
      }
    }
  },
};