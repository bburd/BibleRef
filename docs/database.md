# Database Guide

This project uses SQLite databases to store Bible text. Each translation stores verses in a `verses` table and may include an accompanying FTS5 table `verses_fts` for fast full-text search.

## Translation databases

| File | Content table | FTS5 table |
| --- | --- | --- |
| `kjv_strongs.sqlite` | `verses` | `verses_fts` |
| `asvs.sqlite` | `verses` | `verses_fts` |

The `verses` table contains the book, chapter, verse number, and verse text. When the optional `verses_fts` table exists, it indexes the verse text to power `/brsearch` queries.

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
