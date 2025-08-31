const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const FILES = {
  kjv_strongs: 'kjv_strongs.sqlite',
  asvs: 'asvs.sqlite',
};

function createAdapter(translation = 'asvs', options = {}) {
  const file = FILES[translation.toLowerCase()];
  if (!file) throw new Error(`Unknown translation: ${translation}`);
  const dbPath = path.join(__dirname, '..', '..', 'db', file);
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE);
  const state = { db, columns: null, hasFts: false };

  return introspect(state)
    .then(() => ensureFts(state, options.fts))
    .then(() => ({
      getVerse: (book, chapter, verse) => getVerse(state, book, chapter, verse),
      search: (q, limit) => search(state, q, limit),
      close: () => db.close(),
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
      else resolve(row || null);
    });
  });
}

function search(state, query, limit = 10) {
  const c = state.columns;
  if (state.hasFts) {
    const sql = `SELECT v.${c.book} AS book, v.${c.chapter} AS chapter, v.${c.verse} AS verse, snippet(verses_fts, 0, '<b>', '</b>', '...', 10) AS snippet FROM verses_fts JOIN verses v ON verses_fts.rowid = v.${c.id} WHERE verses_fts MATCH ? LIMIT ?`;
    return all(state.db, sql, [query, limit]);
  } else {
    const sql = `SELECT ${c.book} AS book, ${c.chapter} AS chapter, ${c.verse} AS verse, ${c.text} AS snippet FROM verses WHERE ${c.text} LIKE ? LIMIT ?`;
    return all(state.db, sql, [`%${query}%`, limit]);
  }
}

function all(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

module.exports = { createAdapter, openDatabase: createAdapter };
