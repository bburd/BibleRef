# Database Guide

This project relies on several SQLite databases to store Bible text and reference content. Each database includes one or more tables with the canonical data and an FTS5 virtual table for full‑text search.

## Database overview

| File | Content table(s) | FTS5 table(s) | Notes |
| --- | --- | --- | --- |
| `kjv_strongs.sqlite` | `verses` | `verses_fts` | KJV verse text with Strong's numbers. |
| `asvs.sqlite` | `verses` | `verses_fts` | American Standard Version verse text. |
| `strong_dict.db` | `dictionary` | `dictionary_fts` | Strong's dictionary entries. |
| `strong_pure.db` | `strong_pure` | `strong_pure_fts` | Strong's numbers with transliterations. |
| `strong_words.db` | `strong_words` | `strong_words_fts` | Word concordance information. |
| `kjv_acrostics.db` | `acrostics` | `acrostics_fts` | Acrostic patterns within verses. |
| `kjv_books.db` | `books` | `books_fts` | Metadata and summaries for each Bible book. |
| `kjv_citations.db` | `kjv_citations` | `kjv_citations_fts` | Cross references between verses. |
| `kjv_chapters.db` | `chapters` | `chapters_fts` | Chapter‑level text aggregates. |

### `kjv_strongs.sqlite`
The `verses` table stores the base verse data with fields for the book, chapter, verse, and text. An external‑content FTS5 index `verses_fts` covers the text column, with triggers to keep the index synchronized with changes【F:db/migrate-fts.js†L1-L66】.

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
