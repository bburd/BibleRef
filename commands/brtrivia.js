const { SlashCommandBuilder } = require('@discordjs/builders');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const fs = require('fs').promises;
const { addScore, setSession, getSession } = require('../src/db/trivia');

async function loadTriviaQuestions() {
  try {
    const data = await fs.readFile('bible_trivia.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load trivia questions:', error);
    throw new Error('Failed to load trivia questions');
  }
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
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const triviaQuestions = await loadTriviaQuestions();
      const category = interaction.options.getString('category');
      const triviaQuestion = getTriviaQuestion(triviaQuestions, category);

      if (!triviaQuestion) {
        await interaction.editReply(
          'No trivia question available for the selected category.'
        );
        return;
      }

      const shuffledChoices = shuffleArray(triviaQuestion.choices.slice());
      const correctIndex = shuffledChoices.indexOf(triviaQuestion.answer);

      const embed = new EmbedBuilder()
        .setTitle('Bible Trivia Time!')
        .setDescription(triviaQuestion.question)
        .addFields(
          shuffledChoices.map((choice, index) => ({
            name: `Option ${String.fromCharCode(65 + index)}`,
            value: choice,
            inline: true,
          }))
        )
        .setFooter({ text: `Reference: ${triviaQuestion.reference}` });

      const row = new ActionRowBuilder().addComponents(
        shuffledChoices.map((_, index) =>
          new ButtonBuilder()
            .setCustomId(`trivia_${index}`)
            .setLabel(String.fromCharCode(65 + index))
            .setStyle(ButtonStyle.Primary)
        )
      );

      const message = await interaction.editReply({
        embeds: [embed],
        components: [row],
        fetchReply: true,
      });

      await setSession(interaction.channelId, {
        correct: correctIndex,
        choices: shuffledChoices,
        answered: [],
      });

      const collector = message.createMessageComponentCollector({ time: 60000 });

      collector.on('collect', async (i) => {
        const session = await getSession(interaction.channelId);
        if (!session) {
          await i.reply({ content: 'This trivia session has ended.', ephemeral: true });
          return;
        }
        if (session.answered.includes(i.user.id)) {
          await i.reply({ content: 'You have already answered.', ephemeral: true });
          return;
        }
        const index = parseInt(i.customId.split('_')[1], 10);
        const isCorrect = index === session.correct;
        session.answered.push(i.user.id);
        await setSession(interaction.channelId, session);
        if (isCorrect) {
          await addScore(i.user.id, i.user.username);
          await i.reply({ content: 'Correct! 🎉', ephemeral: true });
        } else {
          await i.reply({
            content: `That's not it! The correct answer was: ${session.choices[session.correct]}`,
            ephemeral: true,
          });
        }
      });

      collector.on('end', async () => {
        await setSession(interaction.channelId, null);
        try {
          const disabledRow = new ActionRowBuilder().addComponents(
            row.components.map((b) => ButtonBuilder.from(b).setDisabled(true))
          );
          await message.edit({ components: [disabledRow] });
        } catch (err) {
          console.error('Failed to disable buttons:', err);
        }
      });
    } catch (error) {
      console.error('An error occurred while executing the trivia command:', error);
      await interaction.editReply(
        'An error occurred during the game setup. Please try again later.'
      );
    }
  },
};

function getTriviaQuestion(triviaQuestions, category) {
  const filteredQuestions = category
    ? triviaQuestions.filter((q) => q.categories.includes(category))
    : triviaQuestions;
  return filteredQuestions[
    Math.floor(Math.random() * filteredQuestions.length)
  ];
}

function shuffleArray(array) {
  for (let i = array.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
