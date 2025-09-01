
const { SlashCommandBuilder } = require('discord.js');
const { getPlanDef, startPlan, completeDay } = require('../db/plans');
const planDefs = require('../../plan_defs.json');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', '..', 'db', 'bot_settings.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

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
          await interaction.reply({ content: 'Plan not found.', ephemeral: true });
          return;
        }
        await startPlan(userId, planId);
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
        await new Promise((resolve, reject) => {
          db.get(
            'SELECT plan_id, day, streak FROM user_plans WHERE user_id = ?',
            [userId],
            async (err, row) => {
              if (err) {
                await interaction.reply({ content: 'Failed to get status.', ephemeral: true });
                return reject(err);
              }
              if (!row) {
                await interaction.reply({ content: 'No active plan.', ephemeral: true });
                return resolve();
              }
              try {
                const plan = await getPlanDef(row.plan_id);
                await interaction.reply({
                  content: `Reading plan: **${plan.name}**. Day ${row.day + 1} of ${plan.days.length}. Current streak: ${row.streak}.`,
                  ephemeral: true,
                });
                resolve();
              } catch (err2) {
                await interaction.reply({ content: 'Failed to get status.', ephemeral: true });
                reject(err2);
              }
            },
          );
        });
      } catch (err) {
        // already replied
      }
    } else if (sub === 'stop') {
      try {
        await new Promise((resolve, reject) => {
          db.get(
            'SELECT plan_id FROM user_plans WHERE user_id = ?',
            [userId],
            async (err, row) => {
              if (err) {
                await interaction.reply({ content: 'Failed to stop plan.', ephemeral: true });
                return reject(err);
              }
              if (!row) {
                await interaction.reply({ content: 'No active plan to stop.', ephemeral: true });
                return resolve();
              }
              db.run(
                'DELETE FROM user_plans WHERE user_id = ?',
                [userId],
                async (err2) => {
                  if (err2) {
                    await interaction.reply({ content: 'Failed to stop plan.', ephemeral: true });
                    reject(err2);
                  } else {
                    await interaction.reply({ content: 'Stopped the current reading plan.', ephemeral: true });
                    resolve();
                  }
                },
              );
            },
          );
        });
      } catch (err) {
        // already replied
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
