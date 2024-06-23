const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const fs = require("fs").promises;

let scores = {};
let isLoadingScores = false;
let isScoresLoaded = false;
const scoresFilePath = "scores.json";

async function loadScores() {
  isLoadingScores = true;
  try {
    const data = await fs.readFile(scoresFilePath, "utf8");
    scores = JSON.parse(data);
    isScoresLoaded = true;
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(
        "Scores file not found. Starting with an empty scores object."
      );
      scores = {};
    } else {
      console.error("Failed to read scores file:", error);
      throw new Error("Failed to load scores");
    }
  } finally {
    isLoadingScores = false;
  }
}

async function saveScores() {
  if (isLoadingScores || !isScoresLoaded) {
    console.log("Skipping save as scores are currently loading or not loaded.");
    return;
  }
  try {
    await fs.writeFile(scoresFilePath, JSON.stringify(scores, null, 2), "utf8");
    console.log("Scores saved successfully.");
  } catch (error) {
    console.error("Failed to save scores:", error);
  }
}

async function loadTriviaQuestions() {
  try {
    const data = await fs.readFile("bible_trivia.json", "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load trivia questions:", error);
    throw new Error("Failed to load trivia questions");
  }
}

// Ensure scores are loaded at startup
loadScores().catch((error) => console.error("Error on initial load:", error));

// Set up periodic saving every 5 minutes
setInterval(saveScores, 300000); // 300000 milliseconds = 5 minutes

process.on("SIGINT", async () => {
  await saveScores(); // Ensure scores are saved when the bot is stopped
  process.exit(0);
});

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
      const triviaQuestions = await loadTriviaQuestions();
      await loadScores();

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

      const message = await interaction.editReply({
        embeds: [embed],
        fetchReply: true,
      });

      const emojis = ["🇦", "🇧", "🇨", "🇩"].slice(0, shuffledChoices.length);
      for (const emoji of emojis) {
        await message.react(emoji);
      }

      const collector = message.createReactionCollector({
        filter: (reaction, user) =>
          emojis.includes(reaction.emoji.name) && !user.bot,
        time: 60000,
      });

      collector.on("collect", async (reaction, user) => {
        handleReaction(
          reaction,
          user,
          triviaQuestion,
          shuffledChoices,
          interaction
        );
      });

      collector.on("end", () => {
        console.log("Trivia question ended");
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

async function handleReaction(
  reaction,
  user,
  triviaQuestion,
  shuffledChoices,
  interaction
) {
  const answerIndex = ["🇦", "🇧", "🇨", "🇩"].indexOf(reaction.emoji.name);
  const isCorrect = shuffledChoices[answerIndex] === triviaQuestion.answer;
  const resultMessage = isCorrect
    ? "Correct! 🎉"
    : `That's not it! The correct answer was: ${triviaQuestion.answer}`;
  await interaction.followUp({
    content: `${user.username}, ${resultMessage}`,
    ephemeral: true,
  });

  if (isCorrect) {
    if (!scores[user.id]) {
      scores[user.id] = { score: 0, username: user.username };
    }
    scores[user.id].score++;
    // Scores will be saved periodically and on shutdown, no need to save now.
  }
  reaction.users.remove(user.id).catch(console.error);
}
