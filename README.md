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
  - starter-14 — Gospel Starter (14 days)
  - john-21 — John in 21 Days
  - ps-prov-31 — Psalms & Proverbs (31 days)
  - nt-90 — New Testament in 90 Days
  - doctrines-14 — Key Doctrines (14 days)
  - gospel-harmony-40 — Harmony of the Gospels (40 days)
  - prayer-psalms-30 — Praying the Psalms (30 days)
  - attributes-21 — Attributes of God (21 days)
#### 6a) Adding new plans
- Read guide below.

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

## 📖 Reading Plans — How to Add Your Own

A **plan** is a JSON object with:
- `id`: a short unique id you’ll use in `/brplan start <id>` (e.g., `"john-21"`)
- `name`: friendly title
- `description`: one‑line summary
- `days`: an **array** with one entry per day

Each **day** can be either:
1. **Simple form** – just an array of readings for that day:
   ```json
   [
     { "book": "John", "chapter": 3, "verses": [16,17,18] },
     { "book": "Psalms", "chapter": 23, "verses": null }
   ]
   ```
2. **With metadata** – an object with a title/note and a `readings` array:
   ```json
   {
     "_meta": { "title": "Beatitudes", "note": "Memorize 5:3‑10" },
     "readings": [
       { "book": "Matthew", "chapter": 5, "verses": [1,2,3,4,5,6,7,8,9,10,11,12] }
     ]
   }
   ```

Each **reading** is an object:
- `book`: either the **name** (`"John"`, `"1 Peter"`) or the **number** (e.g., `43`)  
  > Names are easier to read; the bot maps names to IDs internally.
- `chapter`: number (1‑150 depending on the book)
- `verses`: one of:
  - `null` → the whole chapter
  - a **list of verse numbers** → e.g., `[16,17,18,21]` (discrete picks)
  - a **compact string** (optional if you enable it) → e.g., `"1-14, 26-27"`; the bot’s parser can expand this to numbers

**Optional**: `tags` for future filtering/searching, e.g. `["nt","gospel"]` or `["ot","wisdom"]`.

### Example: three real plans

**Genesis Three Day Plan**
```json
{
  "id": "genesis-3day",
  "name": "Genesis Three Day Plan",
  "description": "Read Genesis 1–3 over three days",
  "days": [
    [ { "book": "Genesis", "chapter": 1, "verses": null, "tags": ["ot"] } ],
    [ { "book": "Genesis", "chapter": 2, "verses": null, "tags": ["ot"] } ],
    [ { "book": "Genesis", "chapter": 3, "verses": null, "tags": ["ot"]  } ]
  ]
}
```

**John in 21 Days**
```json
{
  "id": "john-21",
  "name": "John in 21 Days",
  "description": "Read the Gospel of John, one chapter per day.",
  "days": [
    [ { "book": "John", "chapter": 1, "verses": null } ],
    [ { "book": "John", "chapter": 2, "verses": null } ]
    // …continue through chapter 21
  ]
}
```

**Attributes of God (21 days) — day with a title**
```json
{
  "id": "attributes-21",
  "name": "Attributes of God (21 days)",
  "description": "Holiness, love, justice, mercy, immutability, and more.",
  "days": [
    {
      "_meta": { "title": "Holiness" },
      "readings": [
        { "book": "Isaiah", "chapter": 6, "verses": [1,2,3,5] },
        { "book": "1 Peter", "chapter": 1, "verses": [15,16] }
      ]
    }
  ]
}
```

### IDs, names, and tags (best practices)

- **IDs**: short, URL‑safe, and unique (e.g., `john-21`, `ps-prov-31`, `nt-90`). Users type this in `/brplan start <id>`.
- **Names**: human‑friendly (“New Testament in 90 Days”).
- **Description**: 1–2 sentences; shows up in UIs later.
- **Tags** (optional): strings like `ot`, `nt`, `gospel`, `wisdom`, `prayer`. Future versions can filter by tags.

### Where to add plans
Append each plan object to `plan_defs.json` (top‑level JSON array).

>[!IMPORTANT]
> After adding or editing plans, **restart the bot** (or run `node src/boot/seedPlans.js` if you prefer).

### How the bot renders a day
- If `verses` is `null` → it prints the whole chapter.
- If `verses` is a list → it prints just those verses.
- If you enable compact strings (like `"1-14, 26-27"`), the parser expands them into numbers then prints them neatly.
- If `_meta.title` exists, it prefixes the DM with `Day N: <title>`.

**Tip:** keep a single day’s total text under ~1800 characters so it fits comfortably in a DM. Split long days into two readings or two days.

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
