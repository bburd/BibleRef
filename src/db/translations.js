const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { STRONGS_REGEX, stripStrongs } = require('./strongs');

const FILES = {
  kjv_strongs: 'kjv_strongs.sqlite',
  asvs: 'asvs.sqlite',
  asv: 'asv.sqlite',
  kjv: 'kjv.sqlite',
};

function createAdapter(translation = 'asv', options = {}) {
  const file = FILES[translation.toLowerCase()];
  if (!file) throw new Error(`Unknown translation: ${translation}`);
  const dbPath = path.join(__dirname, '..', '..', 'db', file);
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE);
  const state = { db, columns: null, hasFts: false, stripStrongs: !!options.stripStrongs };

  return introspect(state)
    .then(() => ensureLocIndex(state))
    .then(() => ensureFts(state, options.fts))
    .then(() => ({
      getVerse: (book, chapter, verse) => getVerse(state, book, chapter, verse),
      getChapter: (book, chapter) => getChapter(state, book, chapter),
      getVersesSubset: (book, chapter, verses) =>
        getVersesSubset(state, book, chapter, verses),
      search: (q, limit) => search(state, q, limit),
      close: () => db.close(),
      _db: state.db,
      _cols: state.columns,
    }));
}

function introspect(state) {
  return new Promise((resolve, reject) => {
    state.db.all('PRAGMA table_info(verses)', (err, rows) => {
      if (err) return reject(err);
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
      resolve();
    });
  });
}

function tableExists(db, table) {
  return new Promise((resolve) => {
    db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [table],
      (err, row) => resolve(!!row)
    );
  });
}

function ensureLocIndex(state) {
  const c = state.columns;
  if (!c.book || !c.chapter || !c.verse) return Promise.resolve();
  const sql = `CREATE INDEX IF NOT EXISTS verses_loc_idx ON verses(${c.book}, ${c.chapter}, ${c.verse})`;
  return run(state.db, sql).catch(() => {});
}

function ensureFts(state, build) {
  return tableExists(state.db, 'verses_fts').then((exists) => {
    state.hasFts = exists;
    if (exists || !build) return;
    const c = state.columns;
    const sql = `CREATE VIRTUAL TABLE verses_fts USING fts5(${c.text}, content='verses', content_rowid='${c.id}')`;
    return run(state.db, sql)
      .then(() => run(state.db, "INSERT INTO verses_fts(verses_fts) VALUES('rebuild')"))
      .then(() => {
        state.hasFts = true;
      })
      .catch(() => {});
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });
}

function getVerse(state, book, chapter, verse) {
  const c = state.columns;
  const sql = `SELECT ${c.book} AS book, ${c.chapter} AS chapter, ${c.verse} AS verse, ${c.text} AS text FROM verses WHERE ${c.book}=? AND ${c.chapter}=? AND ${c.verse}=? LIMIT 1`;
  return new Promise((resolve, reject) => {
    state.db.get(sql, [book, chapter, verse], (err, row) => {
      if (err) reject(err);
      else {
        if (row && state.stripStrongs) row.text = stripStrongs(row.text);
        resolve(row || null);
      }
    });
  });
}

function getChapter(state, book, chapter) {
  const c = state.columns;
  const sql = `SELECT ${c.book} AS book, ${c.chapter} AS chapter, ${c.verse} AS verse, ${c.text} AS text FROM verses WHERE ${c.book}=? AND ${c.chapter}=? ORDER BY ${c.verse}`;
  return all(state.db, sql, [book, chapter]).then((rows) =>
    state.stripStrongs ? rows.map((r) => ({ ...r, text: stripStrongs(r.text) })) : rows
  );
}

function getVersesSubset(state, book, chapter, verses) {
  const c = state.columns;
  if (!Array.isArray(verses) || verses.length === 0) return Promise.resolve([]);
  const placeholders = verses.map(() => '?').join(', ');
  const sql = `SELECT ${c.book} AS book, ${c.chapter} AS chapter, ${c.verse} AS verse, ${c.text} AS text FROM verses WHERE ${c.book}=? AND ${c.chapter}=? AND ${c.verse} IN (${placeholders}) ORDER BY ${c.verse}`;
  return all(state.db, sql, [book, chapter, ...verses]).then((rows) =>
    state.stripStrongs ? rows.map((r) => ({ ...r, text: stripStrongs(r.text) })) : rows
  );
}

function search(state, query, limit = 10) {
  const c = state.columns;
  if (query === 'random') {
    const sql = `SELECT ${c.book} AS book, ${c.chapter} AS chapter, ${c.verse} AS verse, ${c.text} AS text FROM verses ORDER BY RANDOM() LIMIT ?`;
    return all(state.db, sql, [limit]).then((rows) =>
      state.stripStrongs ? rows.map((r) => ({ ...r, text: stripStrongs(r.text) })) : rows
    );
  }
  if (state.hasFts) {
    const sql = `SELECT v.${c.book} AS book, v.${c.chapter} AS chapter, v.${c.verse} AS verse, snippet(verses_fts, 0, '<b>', '</b>', '...', 10) AS snippet FROM verses_fts JOIN verses v ON verses_fts.rowid = v.${c.id} WHERE verses_fts MATCH ? LIMIT ?`;
    return all(state.db, sql, [query, limit]).then((rows) =>
      state.stripStrongs
        ? rows.map((r) => ({ ...r, snippet: stripStrongs(r.snippet) }))
        : rows
    );
  } else {
    const sql = `SELECT ${c.book} AS book, ${c.chapter} AS chapter, ${c.verse} AS verse, ${c.text} AS snippet FROM verses WHERE ${c.text} LIKE ? LIMIT ?`;
    return all(state.db, sql, [`%${query}%`, limit]).then((rows) =>
      state.stripStrongs
        ? rows.map((r) => ({ ...r, snippet: stripStrongs(r.snippet) }))
        : rows
    );
  }
}

function all(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

module.exports = { createAdapter, openDatabase: createAdapter };
