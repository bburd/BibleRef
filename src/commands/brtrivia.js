const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const { addScore } = require('../db/trivia');

const activeTrivia = new Map();

async function loadTriviaQuestions() {
  const data = await fs.readFile('bible_trivia.json', 'utf8');
  return JSON.parse(data);
}

function getTriviaQuestion(questions, category) {
  const filtered = category
    ? questions.filter((q) => q.categories.includes(category))
    : questions;
  if (!filtered.length) return null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function respond(interaction, content) {
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp({ content, ephemeral: true });
  }
  return interaction.reply({ content, ephemeral: true });
}

async function execute(interaction) {
  await interaction.deferReply();
  try {
    const triviaQuestions = await loadTriviaQuestions();
    const category = interaction.options.getString('category');
    const triviaQuestion = getTriviaQuestion(triviaQuestions, category);
    if (!triviaQuestion) {
      await interaction.editReply('No trivia question available for the selected category.');
      return;
    }

    const choices = shuffleArray(triviaQuestion.choices.slice());
    const letters = ['A', 'B', 'C', 'D'];
    const correctLetter = letters[choices.indexOf(triviaQuestion.answer)];

    const embed = new EmbedBuilder()
      .setTitle('Bible Trivia Time!')
      .setDescription(triviaQuestion.question)
      .addFields(
        choices.map((choice, idx) => ({
          name: `Option ${letters[idx]}`,
          value: choice.trim(),
          inline: true,
        }))
      )
      .setFooter({ text: `Reference: ${triviaQuestion.reference}` });

    const row = new ActionRowBuilder().addComponents(
      letters.map((l) =>
        new ButtonBuilder()
          .setCustomId(`triv:${l}`)
          .setLabel(l)
          .setStyle(ButtonStyle.Primary)
      )
    );

    const message = await interaction.editReply({
      embeds: [embed],
      components: [row],
      fetchReply: true,
    });

    activeTrivia.set(message.id, {
      correct: correctLetter,
      answer: triviaQuestion.answer.trim(),
      expires: Date.now() + 60000,
    });
    setTimeout(() => activeTrivia.delete(message.id), 60000);
  } catch (err) {
    console.error('An error occurred while executing the trivia command:', err);
    await interaction.editReply('An error occurred during the game setup. Please try again later.');
  }
}

async function handleButtons(interaction) {
  const id = interaction.customId || '';
  if (!id.startsWith('triv:')) return false;
  const choice = id.split(':')[1];
  const info = activeTrivia.get(interaction.message.id);
  if (!info || Date.now() > info.expires) {
    activeTrivia.delete(interaction.message.id);
    try {
      const row = new ActionRowBuilder().addComponents(
        interaction.message.components[0].components.map((c) =>
          ButtonBuilder.from(c).setDisabled(true)
        )
      );
      await interaction.message.edit({ components: [row] });
    } catch (e) {
      console.error('Failed to disable trivia buttons:', e);
    }
    await respond(interaction, 'This trivia session has ended.');
    return true;
  }

  activeTrivia.delete(interaction.message.id);
  const row = new ActionRowBuilder().addComponents(
    interaction.message.components[0].components.map((c) => {
      const btn = ButtonBuilder.from(c).setDisabled(true);
      const letter = c.customId.split(':')[1];
      if (letter === info.correct) btn.setStyle(ButtonStyle.Success);
      else if (letter === choice) btn.setStyle(ButtonStyle.Danger);
      else btn.setStyle(ButtonStyle.Secondary);
      return btn;
    })
  );

  try {
    await interaction.message.edit({ components: [row] });
  } catch (e) {
    console.error('Failed to update trivia buttons:', e);
  }

  if (choice === info.correct) {
    try {
      await addScore(interaction.user.id, interaction.user.username);
    } catch (e) {
      console.error('Failed to add score:', e);
    }
    await respond(interaction, 'Correct! 🎉');
  } else {
    await respond(
      interaction,
      `That's not it! The correct answer was: ${info.answer}`
    );
  }
  return true;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('brtrivia')
    .setDescription('Starts a Bible trivia game')
    .addStringOption((option) =>
      option
        .setName('category')
        .setDescription('Select the category of the trivia')
        .setRequired(false)
        .addChoices(
          { name: 'Exodus', value: 'exodus' },
          { name: 'Gospels', value: 'gospels' },
          { name: 'Judges', value: 'judges' },
          { name: 'Kings', value: 'kings' },
          { name: 'Miracles', value: 'miracles' },
          { name: 'New Testament', value: 'new testament' },
          { name: 'Old Testament', value: 'old testament' },
          { name: 'Prophets', value: 'prophets' }
        )
    ),
  execute,
  handleButtons,
};
