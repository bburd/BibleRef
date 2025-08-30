# Database Guide

This project relies on several SQLite databases to store Bible text and reference content. Each database includes one or more tables with the canonical data and an FTS5 virtual table for full‑text search.

## Database overview

| File | Content table(s) | FTS5 table(s) | Notes |
| --- | --- | --- | --- |
| `kjv_bible.db` | `kjv` | `kjv_fts` | KJV verse text used by commands such as `/brverse`. |
| `kjv_pure.db` | `kjv_pure` | `kjv_pure_fts` | Plain KJV verse data used for search and scheduling features. |
| `strong_dict.db` | `dictionary` | `dictionary_fts` | Strong's dictionary entries. |
| `strong_pure.db` | `strong_pure` | `strong_pure_fts` | Strong's numbers with transliterations. |
| `strong_words.db` | `strong_words` | `strong_words_fts` | Word concordance information. |
| `kjv_acrostics.db` | `acrostics` | `acrostics_fts` | Acrostic patterns within verses. |
| `kjv_books.db` | `books` | `books_fts` | Metadata and summaries for each Bible book. |
| `kjv_citations.db` | `kjv_citations` | `kjv_citations_fts` | Cross references between verses. |
| `kjv_chapters.db` | `chapters` | `chapters_fts` | Chapter‑level text aggregates. |

### `kjv_bible.db`
The `kjv` table stores the base verse data with fields for the book name and text. An external‑content FTS5 index `kjv_fts` covers the `book_name` and `text` columns, with triggers to keep the index synchronized with changes【F:db/migrate-fts.js†L7-L18】【F:db/migrate-fts.js†L43-L63】【F:commands/brverse.js†L7-L26】.

### `kjv_pure.db`
The `kjv_pure` table mirrors KJV verse text and links to the `kjv_pure_fts` index for search operations【F:SearchEngine.js†L7-L16】【F:SearchEngine.js†L96-L101】【F:SearchEngine.js†L142-L145】.

### Other databases
The search engine references additional SQLite databases, each paired with an FTS5 table that joins on `rowid` for full‑text lookups【F:SearchEngine.js†L7-L15】【F:SearchEngine.js†L106-L147】.

## Rebuilding FTS indexes
When base data changes, rebuild the FTS indexes to keep search results accurate.

1. Run the migration script:
   ```bash
   node db/migrate-fts.js
   ```
   This creates missing FTS tables, triggers, and performs a full rebuild using `INSERT INTO <fts_table>(<fts_table>) VALUES('rebuild')`【F:db/migrate-fts.js†L43-L63】.
2. For databases not covered by the script, execute the rebuild command manually:
   ```sql
   INSERT INTO <fts_table>(<fts_table>) VALUES('rebuild');
   ```

## Troubleshooting search performance
- **Missing or stale results** – Ensure FTS tables exist and have been rebuilt after data updates. Rerun the migration script if needed.
- **Slow searches** – Use `VACUUM`, `ANALYZE`, or `PRAGMA optimize` to help SQLite tune the database.
- **Unexpected query plans** – Run `EXPLAIN QUERY PLAN` to verify that the FTS index is being used.
- **Large datasets** – Keep SQLite and dependencies updated and avoid leading wildcards in `MATCH` queries for better performance.
