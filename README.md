# BibleRef
This Discord bot was developed as a personal project to replace multiple bots in my server with just one. If you see this I have made this public and anyone is free to do what they wish with this project.

BibleRef is a comprehensive tool for Bible study and engagement, featuring the American Standard Version (ASV) and the King James Version (KJV) with Strong’s numbers. Users can switch translations at any time with the `/brtranslation` command. The bot includes a variety of features to enrich your spiritual journey and make Bible study more interactive and enjoyable. It is built using Node.js with a small dependency set, making it straightforward to self-host and customize according to your needs.

>[!NOTE]
>This was created with God's will and ChatGPT, all glory to God it is working. 🙏

>[!TIP]
>More trivia questions are always needed and I am open to other suggestions!.

>[!IMPORTANT]
>Don't forget to run 'node deploy-commands.js' and 'node db/migrate-fts.js' (just once) before you run the bot with 'node index.js'

> [!WARNING]
> This bot will require you setup a discord bot using the [Discord developer portal](https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://discord.com/developers/applications&ved=2ahUKEwjrsZnVlvGGAxUSSDABHWEbBQwQFnoECAYQAQ&usg=AOvVaw1wrZe_Tr9Sav0Zx4-42-Jf). It is free and easy, there are many guides available.

## Acknowledgments

### Special thanks to the following repos:
   [Bible Super Search](https://biblesupersearch.com/bible-downloads) for the KJV, ASV and Strongs data.
   [Samleo8](https://github.com/Samleo8/BibleQuizzleDiscord) for some of the trivia questions.

## Key Features:
### 1. Multiple Bible Translations:
   - Access the complete text of the ASV or the KJV with Strong’s numbers directly within Discord. Easily search and reference scriptures for study, discussion, and inspiration.

### 2. Daily Verse:
   - Receive a daily Bible verse automatically delivered to your Discord server. Start your day with a dose of spiritual inspiration and reflection.

### 3. Bible Trivia Game:
   - Challenge yourself and others with a trivia game that includes over 200 Bible-related questions. Test your knowledge, learn new facts, and have fun with friends.

### 4. Easy to Self-Host:
   - Built with Node.js, this bot is easy to set up and host on your own server. The use of a JSON configuration file for storing sensitive information like tokens and IDs makes the bot secure and manageable.

### 5. Interactive Commands:
   - The bot comes with a variety of interactive commands, making it user-friendly and engaging. Users can easily fetch Bible verses, participate in trivia, change translations, and more.

## Dependencies

BibleRef relies on a small set of libraries to remain lightweight:

- `discord.js`
- `sqlite3`
- `node-cron`
- `moment-timezone`
- `lru-cache`
- `undici`

## Getting Started:

To run the bot locally:

1. Clone this repository.
2. Run `npm install` to install dependencies.
3. Copy `env.example` to `.env`.
4. Fill in all required values in `.env`.

After configuration you can deploy commands and start the bot as needed for your environment.

## Full-text Search

SQLite FTS5 virtual tables power fast verse searches. Create or rebuild the `verses_fts` indexes with:

```
node db/migrate-fts.js
```

Run the script whenever the translation databases change to keep search results accurate.

## Commands:

    /brsearch query - Search for verses containing the query.
    /brpoints - View the top 10 users points standings.
    /brmypoints - View your current points standings.
    /brdaily - View the daily verse.
    /brtrivia - Start a Bible trivia game, optionally specifying a category.
    /brtranslation set:<translation> - Set your preferred Bible translation (ASV or KJV Strongs).

## Configuration:

The bot uses a `.env` configuration file (see `env.example`) to store sensitive information securely. ***Do not send your `.env` to anyone!!***

`BRDAILY_ALLOWED_ROLES` is a comma-separated list of Discord role IDs permitted to manage `/brdaily` scheduling commands (`set`, `clear`, `status`). If left blank, any member may use these subcommands.

Here's a sample configuration file:

```env
# These can be generated/reset in the Discord Developer Portal.
TOKEN=YOUR_TOKEN
CLIENT_ID=YOUR_CLIENTID
# On Discord right click your server icon and copy Server ID
GUILD_ID=YOUR_SERVERID
# Comma-separated role IDs allowed to run /brdaily set|clear|status
BRDAILY_ALLOWED_ROLES=
# Rename this file to .env
```

## Testing

Run the automated tests with the built-in Node.js test runner:

```bash
node --test
```

This executes all unit tests.



