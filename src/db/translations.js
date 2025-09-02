const path = require('path');
const { open } = require('./conn');
const { pget, pall, prun, pexec } = require('./p');
const { STRONGS_REGEX, stripStrongs } = require('./strongs');

const FILES = {
  kjv_strongs: 'kjv_strongs.sqlite',
  asvs: 'asvs.sqlite',
  asv: 'asv.sqlite',
  kjv: 'kjv.sqlite',
};

async function createAdapter(translation = 'asv', options = {}) {
  const file = FILES[translation.toLowerCase()];
  if (!file) throw new Error(`Unknown translation: ${translation}`);
  const dbPath = path.join(__dirname, '..', '..', 'db', file);
  const db = open(dbPath);
  const state = { db, columns: null, hasFts: false, stripStrongs: !!options.stripStrongs };
  await introspect(state);
  await ensureLocIndex(state);
  await ensureFts(state, options.fts);
  const cols = state.columns;
  const maybeStrip = (row) => {
    if (!row) return row;
    return state.stripStrongs ? { ...row, text: stripStrongs(row.text) } : row;
  };
  const randomSql = `
    SELECT ${cols.book} AS book, ${cols.chapter} AS chapter, ${cols.verse} AS verse, ${cols.text} AS text
    FROM verses
    ORDER BY RANDOM() LIMIT 1`;
  return {
    getVerse: (book, chapter, verse) => getVerse(state, book, chapter, verse),
    getChapter: (book, chapter) => getChapter(state, book, chapter),
    getVersesSubset: (book, chapter, verses) => getVersesSubset(state, book, chapter, verses),
    search: (q, limit) => search(state, q, limit),
    getRandom() {
      return pget(db, randomSql).then((row) => maybeStrip(row) || null);
    },
    close() {
      db.close();
    },
    _db: state.db,
    _cols: state.columns,
  };
}

async function introspect(state) {
  const rows = await pall(state.db, 'PRAGMA table_info(verses)');
  const cols = {};
  rows.forEach((r) => {
    const name = r.name.toLowerCase();
    if (name === 'id') cols.id = r.name;
    else if (name.includes('book')) cols.book = r.name;
    else if (name.includes('chapter')) cols.chapter = r.name;
    else if (name.includes('verse')) cols.verse = r.name;
    else if (name.includes('text')) cols.text = r.name;
  });
  state.columns = cols;
}

async function tableExists(db, table) {
  const row = await pget(
    db,
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    [table]
  );
  return !!row;
}

async function ensureLocIndex(state) {
  const c = state.columns;
  if (!c.book || !c.chapter || !c.verse) return;
  const sql = `CREATE INDEX IF NOT EXISTS verses_loc_idx ON verses(${c.book}, ${c.chapter}, ${c.verse})`;
  await prun(state.db, sql).catch(() => {});
}

async function ensureFts(state, build) {
  state.hasFts = await tableExists(state.db, 'verses_fts');
  if (state.hasFts || !build) return;
  const c = state.columns;
  const sql = `CREATE VIRTUAL TABLE verses_fts USING fts5(${c.text}, content='verses', content_rowid='${c.id}')`;
  try {
    await prun(state.db, sql);
    await prun(state.db, "INSERT INTO verses_fts(verses_fts) VALUES('rebuild')");
    state.hasFts = true;
  } catch (err) {
    // ignore
  }
}

async function getVerse(state, book, chapter, verse) {
  const c = state.columns;
  const sql = `SELECT ${c.book} AS book, ${c.chapter} AS chapter, ${c.verse} AS verse, ${c.text} AS text FROM verses WHERE ${c.book}=? AND ${c.chapter}=? AND ${c.verse}=? LIMIT 1`;
  const row = await pget(state.db, sql, [book, chapter, verse]);
  if (row && state.stripStrongs) row.text = stripStrongs(row.text);
  return row || null;
}

async function getChapter(state, book, chapter) {
  const c = state.columns;
  const sql = `SELECT ${c.book} AS book, ${c.chapter} AS chapter, ${c.verse} AS verse, ${c.text} AS text FROM verses WHERE ${c.book}=? AND ${c.chapter}=? ORDER BY ${c.verse}`;
  const rows = await pall(state.db, sql, [book, chapter]);
  return state.stripStrongs ? rows.map((r) => ({ ...r, text: stripStrongs(r.text) })) : rows;
}

async function getVersesSubset(state, book, chapter, verses) {
  const c = state.columns;
  if (!Array.isArray(verses) || verses.length === 0) return [];
  const placeholders = verses.map(() => '?').join(', ');
  const sql = `SELECT ${c.book} AS book, ${c.chapter} AS chapter, ${c.verse} AS verse, ${c.text} AS text FROM verses WHERE ${c.book}=? AND ${c.chapter}=? AND ${c.verse} IN (${placeholders}) ORDER BY ${c.verse}`;
  const rows = await pall(state.db, sql, [book, chapter, ...verses]);
  return state.stripStrongs ? rows.map((r) => ({ ...r, text: stripStrongs(r.text) })) : rows;
}

async function search(state, query, limit = 10) {
  const c = state.columns;
  if (query === 'random') {
    const sql = `SELECT ${c.book} AS book, ${c.chapter} AS chapter, ${c.verse} AS verse, ${c.text} AS text FROM verses ORDER BY RANDOM() LIMIT ?`;
    const rows = await pall(state.db, sql, [limit]);
    return state.stripStrongs ? rows.map((r) => ({ ...r, text: stripStrongs(r.text) })) : rows;
  }
  if (state.hasFts) {
    const sql = `SELECT v.${c.book} AS book, v.${c.chapter} AS chapter, v.${c.verse} AS verse, snippet(verses_fts, 0, '<b>', '</b>', '...', 10) AS snippet FROM verses_fts JOIN verses v ON verses_fts.rowid = v.${c.id} WHERE verses_fts MATCH ? LIMIT ?`;
    const rows = await pall(state.db, sql, [query, limit]);
    return state.stripStrongs
      ? rows.map((r) => ({ ...r, snippet: stripStrongs(r.snippet) }))
      : rows;
  } else {
    const sql = `SELECT ${c.book} AS book, ${c.chapter} AS chapter, ${c.verse} AS verse, ${c.text} AS snippet FROM verses WHERE ${c.text} LIKE ? LIMIT ?`;
    const rows = await pall(state.db, sql, [`%${query}%`, limit]);
    return state.stripStrongs
      ? rows.map((r) => ({ ...r, snippet: stripStrongs(r.snippet) }))
      : rows;
  }
}

module.exports = { createAdapter, openDatabase: createAdapter };
