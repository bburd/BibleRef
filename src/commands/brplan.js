const { SlashCommandBuilder } = require('discord.js');
const {
  getPlanDef,
  startPlan,
  completeDay,
  getUserPlan,
  stopPlan,
  listPlanDefs,
  updateLastNotified,
} = require('../db/plans');
const { ephemeral } = require('../utils/ephemeral');
const { formatDayWithText } = require('../lib/plan-format-text');
const { getUserTranslation } = require('../db/user-prefs');

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function chunkText(text, maxLength = 1900) {
  const lines = text.split('\n');
  const chunks = [];
  let current = '';
  for (const line of lines) {
    if ((current + line + '\n').length > maxLength) {
      if (current) chunks.push(current.trimEnd());
      current = '';
    }
    current += line + '\n';
  }
  if (current) chunks.push(current.trimEnd());
  return chunks;
}

async function sendChunks(user, header, bodyText) {
  const chunks =
    bodyText.length > 1900 ? chunkText(bodyText) : [bodyText];
  await user.send(`${header}\n${chunks[0]}`);
  for (let i = 1; i < chunks.length; i++) {
    await user.send(chunks[i]);
  }
}

async function build() {
  const plans = await listPlanDefs();
  const builder = new SlashCommandBuilder()
    .setName('brplan')
    .setDescription('Manage reading plans')
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Start a reading plan')
        .addStringOption((opt) => {
          opt.setName('plan').setDescription('Plan ID').setRequired(true);
          plans.forEach((p) =>
            opt.addChoices({ name: p.name || p.id, value: p.id })
          );
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
      sub
        .setName('complete')
        .setDescription("Mark today's reading as complete")
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List available reading plans')
    );
  return builder;
}

module.exports = {
  build,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user?.id;
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
        const translation = (await getUserTranslation(userId)) || 'asv';
        const bodyText = await formatDayWithText(dayReadings, translation);
        try {
          await sendChunks(
            interaction.user,
            `Day 1${title ? `: ${title}` : ':'}`,
            bodyText
          );
          await updateLastNotified(userId, todayStr());
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
          const title = nextDayReadings._meta && nextDayReadings._meta.title;
          const translation = (await getUserTranslation(userId)) || 'asv';
          const bodyText = await formatDayWithText(nextDayReadings, translation);
          try {
            await sendChunks(
              interaction.user,
              `Day ${nextDay + 1}${title ? `: ${title}` : ':'}`,
              bodyText
            );
            await updateLastNotified(userId, todayStr());
          } catch (err) {
            console.error('Failed to send DM:', err);
          }
        } else {
          try {
            await interaction.user.send('Plan completed!');
            await updateLastNotified(userId, todayStr());
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
    } else if (sub === 'list') {
      try {
        const plans = await listPlanDefs();
        const ids = plans.map((p) => p.id);
        const content = ids.length
          ? `Available plans: ${ids.join(', ')}`
          : 'No plans available.';
        await interaction.reply(ephemeral({ content }));
      } catch (err) {
        await interaction.reply(
          ephemeral({ content: 'Failed to list plans.' })
        );
      }
    }
  },
};
