# BibleRef
This Discord bot was developed as a personal project to replace multiple bots in my server with just one. If you see this I have made this public and anyone is free to do what they wish with this project.

BibleRef is a comprehensive tool for Bible study and engagement, featuring the full King James Version (KJV) Bible ~~and the Strong's Concordance~~. It includes a variety of features to enrich your spiritual journey and make Bible study more interactive and enjoyable. The bot is built using Node.js, making it straightforward to self-host and customize according to your needs.

>[!NOTE]
>This was created with God's will and ChatGPT, all glory to God it is working. 🙏

>[!TIP]
>More trivia questions are always needed and I am open to other suggestions, however my coding skills are rather limited.

>[!IMPORTANT]
>Please accept my *formal apology to the coding community* for creating what I can only assume is a disgrace.

> [!WARNING]
> This bot will require you setup a discord bot using the [Discord developer portal](https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://discord.com/developers/applications&ved=2ahUKEwjrsZnVlvGGAxUSSDABHWEbBQwQFnoECAYQAQ&usg=AOvVaw1wrZe_Tr9Sav0Zx4-42-Jf). It is free and easy, there are many guides available.

## Acknowledgments

### Special thanks to the following repos:
   [1John419](https://github.com/1John419/kjs) for the KJV and Concordance data.\
   [Samleo8](https://github.com/Samleo8/BibleQuizzleDiscord) for some of the trivia questions.

## Key Features:
### 1. Full KJV Bible:
   - Access the complete text of the King James Version Bible directly within Discord. Easily search and reference scriptures for study, discussion, and inspiration.

### 2. ~~Strong's Concordance:~~
   - ~~Utilize the Strong's Concordance for in-depth Bible study. Look up the original Greek and Hebrew words, understand their meanings, and see where they appear in the Bible.~~
      **Strongs concordance is currently a WIP**

### 3. Daily Verse:
   - Receive a daily Bible verse automatically delivered to your Discord server. Start your day with a dose of spiritual inspiration and reflection.

### 4. Bible Trivia Game:
   - Challenge yourself and others with a trivia game that includes over 200 Bible-related questions. Test your knowledge, learn new facts, and have fun with friends.

### 5. Easy to Self-Host:
   - Built with Node.js, this bot is easy to set up and host on your own server. The use of a JSON configuration file for storing sensitive information like tokens and IDs makes the bot secure and manageable.

### 6. Interactive Commands:
   - The bot comes with a variety of interactive commands, making it user-friendly and engaging. Users can easily fetch Bible verses, participate in trivia, and more.

## Getting Started:

To get started with this bot, you will need to have a hosting solution for Node.js and the host will need to allow more than one sqlite database. Check the setup guide for details. Clone the repository, configure the necessary settings in the config.json file, and run the bot on your server. The bot is designed to be easy to deploy and customize, making it a great addition to any Discord community focused on Bible study and fellowship.

## Commands:

    /brsearch Luke 1:1-3 or Luke - Retrieve all information matching search term.
    /brpoints - View the top 10 users points standings.
    /brmypoints - View your current points standings.
    /brdaily - View the daily verse.
    /brtrivia - Start a Bible trivia game, optionally specifying a category.

## Configuration:

The bot uses a JSON configuration file (config.json) to store sensitive information securely. ***Do not send your config.json to anyone!!***
Here's a sample configuration file:
### DO NOT COPY PASTE THE EXAMPLE BELOW. There is a config.json file that can be edited included.
```
{
  "token": A09Kv834Dv908G32E4fnaEsv8T23TfvH8hf34DF8h, // Your bot token should not have the quotation marks ("")
  "clientId": 123498741253, // Your client ID should not have the quotation marks ("")
  "guildId": 123489075413 // Your guild ID should not have the quotation marks ("")
}
```



