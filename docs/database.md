# Database Guide

This project uses SQLite databases to store Bible text and user preferences. Each translation stores verses in a `verses` table and may include an accompanying FTS5 table `verses_fts` for fast full-text search.

## Translation databases

| File | Content table | FTS5 table |
| --- | --- | --- |
| `kjv_strongs.sqlite` | `verses` | `verses_fts` |
| `asvs.sqlite`        | `verses` | `verses_fts` |

### `verses` schema

```sql
CREATE TABLE verses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL
);
```

The `verses_fts` table is optional. When present it indexes the verse text to power `/brsearch` queries. If the FTS table is missing, the bot falls back to simple `LIKE` queries.

## User preferences

Per-user translation choices are stored in `db/bot_settings.sqlite`:

```sql
CREATE TABLE user_prefs (
  user_id TEXT PRIMARY KEY,
  translation TEXT CHECK(translation IN ('asvs','kjv_strongs')),
  updated_at INTEGER
);
```

## Rebuilding FTS indexes

When verse data changes, rebuild the FTS indexes to keep search results accurate:

1. Run the migration script:
   ```bash
   node db/migrate-fts.js
   ```
   This creates missing FTS tables and performs a full rebuild using `INSERT INTO <fts_table>(<fts_table>) VALUES('rebuild')`.
2. If you add a new translation, ensure a corresponding entry exists in the script and re-run it.

## Troubleshooting search performance
- **Missing or stale results** – Rebuild the FTS tables after data updates.
- **Slow searches** – Use `VACUUM`, `ANALYZE`, or `PRAGMA optimize` to help SQLite tune the database.
- **Unexpected query plans** – Run `EXPLAIN QUERY PLAN` to verify that the FTS index is being used.
