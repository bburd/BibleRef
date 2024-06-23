const sqlite3 = require("sqlite3").verbose();
const path = require("path");

class SearchEngine {
  constructor() {
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
    for (const key in this.databases) {
      this.dbConnections[key] = new sqlite3.Database(
        path.join(__dirname, this.databases[key]),
        sqlite3.OPEN_READONLY,
        (err) => {
          if (err) console.error(`Error opening ${key} database:`, err.message);
        }
      );
    }
  }

  async queryDatabase(db, query, params) {
    return new Promise((resolve, reject) => {
      this.dbConnections[db].all(query, params, (err, rows) => {
        if (err) {
          console.error(`Error running query in ${db}:`, err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async search(term) {
    const searchTerm = `%${term}%`;
    try {
      const results = await Promise.all([
        this.queryDatabase(
          "dbDict",
          "SELECT * FROM dictionary WHERE key LIKE ? OR transliteration LIKE ? OR definitions LIKE ?",
          [searchTerm, searchTerm, searchTerm]
        ),
        this.queryDatabase(
          "dbPure",
          "SELECT * FROM strong_pure WHERE text_part LIKE ?",
          [searchTerm]
        ),
        this.queryDatabase(
          "dbWords",
          "SELECT * FROM strong_words WHERE strong_id LIKE ?",
          [searchTerm]
        ),
        this.queryDatabase(
          "dbAcrostics",
          "SELECT * FROM acrostics WHERE value LIKE ?",
          [searchTerm]
        ),
        this.queryDatabase(
          "dbBooks",
          "SELECT * FROM books WHERE name LIKE ? OR abbreviation LIKE ?",
          [searchTerm, searchTerm]
        ),
        this.queryDatabase(
          "dbCitations",
          "SELECT * FROM kjv_citations WHERE citation LIKE ?",
          [searchTerm]
        ),
        this.queryDatabase(
          "dbChapters",
          "SELECT * FROM chapters WHERE chapter_name LIKE ? OR chapter_number LIKE ?",
          [searchTerm, searchTerm]
        ),
        this.queryDatabase(
          "dbKjvPure",
          "SELECT * FROM kjv_pure WHERE verse_text LIKE ?",
          [searchTerm]
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
