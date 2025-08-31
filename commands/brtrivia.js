const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const fs = require("fs").promises;
const { addScore, setSession, getSession } = require("../src/db/trivia");

async function loadTriviaQuestions() {
  try {
    const data = await fs.readFile("bible_trivia.json", "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load trivia questions:", error);
    throw new Error("Failed to load trivia questions");
  }
}

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

module.exports = {
  data: new SlashCommandBuilder()
    .setName("brtrivia")
    .setDescription("Starts a Bible trivia game")
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("Select the category of the trivia")
        .setRequired(false)
        .addChoices(
          { name: "Exodus", value: "exodus" },
          { name: "Gospels", value: "gospels" },
          { name: "Judges", value: "judges" },
          { name: "Kings", value: "kings" },
          { name: "Miracles", value: "miracles" },
          { name: "New Testament", value: "new testament" },
          { name: "Old Testament", value: "old testament" },
          { name: "Prophets", value: "prophets" }
        )
    ),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const existing = await getSession(interaction.guildId);
      if (existing) {
        await interaction.editReply(
          "A trivia question is already active in this server."
        );
        return;
      }

      const triviaQuestions = await loadTriviaQuestions();
      const category = interaction.options.getString("category");
      const triviaQuestion = getTriviaQuestion(triviaQuestions, category);

      if (!triviaQuestion) {
        await interaction.editReply(
          "No trivia question available for the selected category."
        );
        return;
      }

      const shuffledChoices = shuffleArray(triviaQuestion.choices.slice());
      const embed = new EmbedBuilder()
        .setTitle("Bible Trivia Time!")
        .setDescription(triviaQuestion.question)
        .addFields(
          shuffledChoices.map((choice, index) => ({
            name: `Option ${String.fromCharCode(65 + index)}`,
            value: choice,
            inline: true,
          }))
        )
        .setFooter({ text: `Reference: ${triviaQuestion.reference}` });

      const buttons = shuffledChoices.map((_, index) =>
        new ButtonBuilder()
          .setCustomId(String(index))
          .setLabel(String.fromCharCode(65 + index))
          .setStyle(ButtonStyle.Primary)
      );
      const row = new ActionRowBuilder().addComponents(buttons);

      const message = await interaction.editReply({
        embeds: [embed],
        components: [row],
        fetchReply: true,
      });

      await setSession(interaction.guildId, { messageId: message.id });

      const answeredUsers = new Set();
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
      });

      collector.on("collect", async (i) => {
        if (answeredUsers.has(i.user.id)) {
          await i.reply({
            content: "You have already answered this question.",
            ephemeral: true,
          });
          return;
        }

        answeredUsers.add(i.user.id);

        const index = parseInt(i.customId, 10);
        const isCorrect =
          shuffledChoices[index] === triviaQuestion.answer;
        const resultMessage = isCorrect
          ? "Correct! 🎉"
          : `That's not it! The correct answer was: ${triviaQuestion.answer}`;

        await addScore(i.user.id, i.user.username, isCorrect);
        await interaction.channel.send({
          content: `${i.user.username}, ${resultMessage}`,
        });
        await i.deferUpdate();
      });

      collector.on("end", async () => {
        await setSession(interaction.guildId, null);
        const disabled = new ActionRowBuilder().addComponents(
          row.components.map((btn) => ButtonBuilder.from(btn).setDisabled(true))
        );
        await message.edit({ components: [disabled] }).catch(() => {});
      });
    } catch (error) {
      console.error(
        "An error occurred while executing the trivia command:",
        error
      );
      await interaction.editReply(
        "An error occurred during the game setup. Please try again later."
      );
    }
  },
};
