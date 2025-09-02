# BibleRef

BibleRef is a compact, self-hostable Discord bot for Bible study, daily engagement, and fellowship. This bot is not dependant on any external API, both translations are included in SQLite databases. It supports **ASV** and **KJV** for reading, and opt-in **Strong’s** features using ASV/KJV datasets enriched with Strong’s numbers. Users can set their preferred reading translation with `/brtranslation`.

>[!NOTE]
>This was created with God's will and ChatGPT — Soli Deo Gloria. 🙏

>[!TIP]
>Trivia contributions are welcome! PRs with new questions/categories are appreciated.

>[!WARNING]
>You must create a Discord application/bot in the [Discord Developer Portal](https://discord.com/developers/applications) it is easy and there are several guides.
>You will also need a way to host (run) the bot. This can be done on any computer or a cheap VPS. **Search "how to host a node server" if you are unsure.**

>[!IMPORTANT]
>Before first run:  
>1) `node db/migrate-fts.js` (creates/search-optimizes FTS5 indexes)  
>2) `node deploy-commands.js` (registers slash commands)

---

## ✨ What’s New v2.0.0

- **Reading vs Strong’s stacks**
  - Reading everywhere uses **plain** DBs: `db/asv.sqlite`, `db/kjv.sqlite`.
  - Strong’s features use **asvs**/**kjv_strongs** only when needed.
  - If a plain DB is missing, the bot falls back to Strong’s and **strips inline Strong’s tags** automatically.
- **/brcardverse** — renders a shareable **image card** for a verse (ASV/KJV), using `@napi-rs/canvas`.
- **/brlex** — Strong’s **lexicon** lookups:
  - `/brlex id <G####|H####>` shows lemma, transliteration, gloss, and **verse occurrences** (Prev/Next buttons).
  - `/brlex search <term>` searches the dictionary by lemma/translit/gloss.
- **/brplan** — lightweight **reading plans & streaks**:
  - `/brplan start <plan>` (e.g., `j7` for John 1–7), `/brplan status`, `/brplan complete`, `/brplan stop`.
  - DMs the daily block when possible; streaks tracked in SQLite.
- **/brdaily** — per-guild, per-channel, **per-timezone** daily verse scheduling with `node-cron` + `moment-timezone`.
- **/brsearch** — paginated search with small button IDs (`Prev/Next`), sessions stored server-side (no >100 char customId issues).
- **/brsurprise** — get a random verse from anywhere in the bible. (Coming soon)
- **Book/Ref autocomplete** — smarter completion for books and reference patterns (`John 3:16-18, 21`).
- **Performance/robustness**
  - Optional **LRU session stores** for trivia/search (prevents memory growth vs plain `Map`).
  - Consistent **promise-based** SQLite helpers, better try/catch boundaries, graceful fallbacks when FTS5 is unavailable.
- **Discord v15-ready**
  - Listens to `clientReady` (with `ready` fallback).
  - Uses **message flags** for ephemeral replies (no deprecation warnings).

---

## 📚 Features

### 1) Multiple Translations
- Reading: **ASV** (default) or **KJV** — switch with `/brtranslation`.
- Strong’s: **ASVS/KJV_Strongs** for `/brlex`, `/brinterlinear` (if added later).

### 2) Daily Verse
- Auto-post in a chosen channel at a local time per guild: `/brdaily set <#channel> <HH:mm> <IANA_TZ>`.
- `/brdaily status`, `/brdaily clear` supported.
- Honors `BRDAILY_ALLOWED_ROLES` (see **Configuration**) if you want to restrict who can manage it.

### 3) Bible Trivia
- `/brtrivia start` to post a timed multi-choice question (A/B/C/D buttons).  
- Tracks points and streaks; `/brpoints` and `/brmypoints` show standings.

### 4) Verse Search & References
- `/brsearch query:"love of God"` for text search (FTS5 if available, fallback to LIKE).
- `/brsearch topic:"love"`, optional pagination buttons.
- `/brverse John 3 16`, `/brverse John 3 16-18`, `/brverse John 3 16, 18, 21` supported.
- `/brsurprise`, get a random verse from anywhere in the Bible.

### 5) Verse Cards
- `/brcardverse John 3 16` → clean PNG card (verse + reference) for sharing.

### 6) Reading Plans
- `/brplan start j7` (John 1–7) → DMs Day 1.
- `/brplan complete` advances; `/brplan status`, `/brplan stop` manage state.
- Plans & progress stored in SQLite for concurrency-safe updates.
- Bundled plans:
  - genesis-3day — Genesis Three Day Plan

#### Adding new plans
Append new entries to `plan_defs.json`, each with:
- `id`
- `name`
- `description`
- `days`: array of reading objects

Example:

```json
{
  "id": "psalms-1day",
  "name": "Psalms One Day Plan",
  "description": "Read Psalms 1-3 in a single day",
  "days": [
    { "readings": [ { "book": 19, "ranges": [ { "chapter": 1 }, { "chapter": 2 }, { "chapter": 3 } ] } ] }
  ]
}
```

Restart the bot or rerun `node src/boot/seedPlans.js` to load changes.

### 7) Translation Preference
- `/brtranslation set asv|kjv` — stored per user in `db/bot_settings.sqlite`.

---

## 🧩 Commands

```
/brverse <book> <chapter> <verse|range|list> [translation]

/brcardverse <book> <chapter> <verse>

/brsearch query <text> [translation]

/brsearch topic <phrase> [translation]

/brlex id <G####|H####>

/brlex search <term>

/brplan start <plan>

/brplan status

/brplan complete

/brplan stop

/brtrivia start [category]

/brtrivia stop

/brpoints

/brmypoints

/brdaily set <#channel> <HH:mm> <IANA_TZ>

/brdaily status

/brdaily clear

/brtranslation set <asv|kjv>
```

> **Note**  
> All commands are prefixed with **`br`** to avoid conflicts with other bots.

---

## 🗄️ Data & Files

**Required reading DBs (place in `./db/`):**
- `asv.sqlite` — American Standard Version
- `kjv.sqlite` — King James Version

**Strong’s DBs (used by lex/interlinear features):**
- `asvs.sqlite` — ASV with Strong’s
- `kjv_strongs.sqlite` — KJV with Strong’s

**Auto-created on first run:**
- `bot_settings.sqlite` — user prefs, plans, scheduling, trivia/scores
- FTS5 index tables: `verses_fts` in each translation file (if FTS5 is available)

**Other assets:**
- `db/strongs-dictionary.json` — Strong’s lemma/translit/gloss (for `/brlex`)
- `assets/Inter-Regular.ttf` — font used by `/brcardverse`

> If a plain DB is missing, the bot falls back to the Strong’s DB **and strips markers** like `{G3056}`, `<H0123>`, `[G3056]` before rendering.

---

## ⚙️ Configuration

Create a `.env` from `env.example`:

```env
# Found in Discord Dev Portal
TOKEN=YOUR_BOT_TOKEN
CLIENT_ID=YOUR_APP_ID
# In Discord right click your server icon and copy ServerID
GUILD_ID=YOUR_Discord_ServerID

# Comma-separated role IDs allowed to manage /brdaily set|clear|status
BRDAILY_ALLOWED_ROLES=

# Optional: debug logging
DEBUG_BIBLE=0
```

> **Do not commit or share `.env`.**

---

## 🚀 Getting Started

```bash
# 1) Install deps
npm install

# 2) Configure
cp env.example .env
# edit .env with TOKEN, CLIENT_ID, (optional) GUILD_ID

# 3) Prepare search (once)
node db/migrate-fts.js

# 4) Register slash commands
node deploy-commands.js

# 5) Run the bot
node index.js
```

**Discord v15 readiness:** The bot listens to both `ready` and `clientReady`, and uses **flags** for ephemeral responses. No warnings in Node logs.

---

## 🔎 Full-Text Search (FTS5)

We use SQLite FTS5 virtual tables for fast search. The migration script creates `verses_fts` as a content-backed index and rebuilds/optimizes it. Run:

```bash
node db/migrate-fts.js
```

Run again whenever you change/replace any of the translation databases.

---

## 🧰 Implementation Notes

- **Sessions:** trivia/search use short button IDs and **server-side sessions** (message-id keyed). Consider enabling the provided `lru-cache` stores to cap memory usage.
- **SQLite:** code paths gracefully fall back to `LIKE` when FTS5 isn’t compiled. Reads are parameterized.
- **Input validation:** Strong’s IDs (`G####|H####`), times (`HH:mm`), and timezones (IANA) are validated; book & reference parsing supports ranges/lists.
- **Fonts:** `/brcardverse` registers `assets/Inter-Regular.ttf`; if missing, it falls back to a system font.

---

## 🧪 Testing

Run Node’s test runner (if tests are present):

```bash
node --test
```

---

## 🙏 Acknowledgments

[Bible Super Search](https://biblesupersearch.com/bible-downloads) for the KJV, ASV and Strongs data.
[Samleo8](https://github.com/Samleo8/BibleQuizzleDiscord) for some of the trivia questions.

---

## 📄 License

MIT — see `LICENSE.md` for details.
