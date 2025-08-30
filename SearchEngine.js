const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const LRU = require("lru-cache");

class SearchEngine {
  constructor(options = {}) {
    this.databases = {
      dbDict: "strong_dict.db",
      dbPure: "strong_pure.db",
      dbWords: "strong_words.db",
      dbAcrostics: "kjv_acrostics.db",
      dbBooks: "kjv_books.db",
      dbCitations: "kjv_citations.db",
      dbChapters: "kjv_chapters.db",
      dbKjvPure: "kjv_pure.db",
    };

    this.dbConnections = {};
    this.idleTimeout = options.timeout || 5 * 60 * 1000; // 5 minutes default

    this.statementCache = new LRU({
      max: options.cacheSize || 100,
      dispose: (stmt) => {
        try {
          stmt.finalize();
        } catch (e) {}
      },
    });
  }

  cleanupConnections() {
    const now = Date.now();
    for (const key of Object.keys(this.dbConnections)) {
      const info = this.dbConnections[key];
      if (now - info.lastUsed > this.idleTimeout) {
        info.db.close();
        delete this.dbConnections[key];

        for (const stmtKey of this.statementCache.keys()) {
          if (stmtKey.startsWith(`${key}:`)) {
            const stmt = this.statementCache.get(stmtKey);
            if (stmt) {
              try {
                stmt.finalize();
              } catch (e) {}
            }
            this.statementCache.delete(stmtKey);
          }
        }
      }
    }
  }

  getConnection(dbKey) {
    this.cleanupConnections();

    let info = this.dbConnections[dbKey];
    if (!info) {
      const db = new sqlite3.Database(
        path.join(__dirname, this.databases[dbKey]),
        sqlite3.OPEN_READONLY,
        (err) => {
          if (err)
            console.error(`Error opening ${dbKey} database:`, err.message);
        }
      );
      info = { db, lastUsed: Date.now() };
      this.dbConnections[dbKey] = info;
    } else {
      info.lastUsed = Date.now();
    }
    return info.db;
  }

  async queryDatabase(dbKey, query, params) {
    const db = this.getConnection(dbKey);
    const cacheKey = `${dbKey}:${query}`;
    let stmt = this.statementCache.get(cacheKey);
    if (!stmt) {
      stmt = db.prepare(query);
      this.statementCache.set(cacheKey, stmt);
    }

    return new Promise((resolve, reject) => {
      stmt.all(params, (err, rows) => {
        if (err) {
          console.error(`Error running query in ${dbKey}:`, err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async search(term) {
    try {
      const results = await Promise.all([
        this.queryDatabase(
          "dbDict",
          "SELECT d.*, snippet(dictionary_fts, -1, '<b>', '</b>', '...', 10) AS snippet FROM dictionary_fts JOIN dictionary d ON dictionary_fts.rowid = d.rowid WHERE dictionary_fts MATCH ?",
          [term]
        ),
        this.queryDatabase(
          "dbPure",
          "SELECT sp.*, snippet(strong_pure_fts, -1, '<b>', '</b>', '...', 10) AS snippet FROM strong_pure_fts JOIN strong_pure sp ON strong_pure_fts.rowid = sp.rowid WHERE strong_pure_fts MATCH ?",
          [term]
        ),
        this.queryDatabase(
          "dbWords",
          "SELECT sw.*, snippet(strong_words_fts, -1, '<b>', '</b>', '...', 10) AS snippet FROM strong_words_fts JOIN strong_words sw ON strong_words_fts.rowid = sw.rowid WHERE strong_words_fts MATCH ?",
          [term]
        ),
        this.queryDatabase(
          "dbAcrostics",
          "SELECT a.*, snippet(acrostics_fts, -1, '<b>', '</b>', '...', 10) AS snippet FROM acrostics_fts JOIN acrostics a ON acrostics_fts.rowid = a.rowid WHERE acrostics_fts MATCH ?",
          [term]
        ),
        this.queryDatabase(
          "dbBooks",
          "SELECT b.*, snippet(books_fts, -1, '<b>', '</b>', '...', 10) AS snippet FROM books_fts JOIN books b ON books_fts.rowid = b.rowid WHERE books_fts MATCH ?",
          [term]
        ),
        this.queryDatabase(
          "dbCitations",
          "SELECT c.*, snippet(kjv_citations_fts, -1, '<b>', '</b>', '...', 10) AS snippet FROM kjv_citations_fts JOIN kjv_citations c ON kjv_citations_fts.rowid = c.rowid WHERE kjv_citations_fts MATCH ?",
          [term]
        ),
        this.queryDatabase(
          "dbChapters",
          "SELECT ch.*, snippet(chapters_fts, -1, '<b>', '</b>', '...', 10) AS snippet FROM chapters_fts JOIN chapters ch ON chapters_fts.rowid = ch.rowid WHERE chapters_fts MATCH ?",
          [term]
        ),
        this.queryDatabase(
          "dbKjvPure",
          "SELECT kp.*, snippet(kjv_pure_fts, 0, '<b>', '</b>', '...', 10) AS snippet FROM kjv_pure_fts JOIN kjv_pure kp ON kjv_pure_fts.rowid = kp.rowid WHERE kjv_pure_fts MATCH ?",
          [term]
        ),
      ]);

      return {
        dictionary: results[0],
        strong_pure: results[1],
        strong_words: results[2],
        kjv_acrostics: results[3],
        kjv_books: results[4],
        kjv_citations: results[5],
        kjv_chapters: results[6],
        kjv_pure: results[7],
      };
    } catch (error) {
      console.error("Search operation failed:", error);
      throw error; // Rethrow the error if you want to handle it further up the chain
    }
  }
}

module.exports = SearchEngine;
