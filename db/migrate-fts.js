const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const configs = [
  {
    file: path.join(__dirname, '..', 'kjv_bible.db'),
    ftsTable: 'kjv_fts',
    contentTable: 'kjv',
    contentRowid: 'id',
    columns: ['book_name', 'text'],
  },
  {
    file: path.join(__dirname, '..', 'kjv_pure.db'),
    ftsTable: 'kjv_pure_fts',
    contentTable: 'kjv_pure',
    contentRowid: 'rowid',
    columns: ['verse_text'],
  },
];

configs.forEach((cfg) => {
  if (!fs.existsSync(cfg.file)) {
    console.warn(`Database not found: ${cfg.file}, skipping.`);
    return;
  }
  const db = new sqlite3.Database(cfg.file);
  const colsDef = cfg.columns.join(', ');
  const colNames = cfg.columns.join(', ');
  const newCols = cfg.columns.map((c) => `NEW.${c}`).join(', ');

  db.get(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    [cfg.contentTable],
    (err, row) => {
      if (err || !row) {
        console.warn(`Table ${cfg.contentTable} not found in ${cfg.file}, skipping.`);
        db.close();
        return;
      }

      db.serialize(() => {
        db.run(
          `CREATE VIRTUAL TABLE IF NOT EXISTS ${cfg.ftsTable} USING fts5(${colsDef}, content='${cfg.contentTable}', content_rowid='${cfg.contentRowid}')`
        );
        db.run(`INSERT INTO ${cfg.ftsTable}(${cfg.ftsTable}) VALUES('rebuild')`);

        db.run(
          `CREATE TRIGGER IF NOT EXISTS ${cfg.contentTable}_ai AFTER INSERT ON ${cfg.contentTable} BEGIN
             INSERT INTO ${cfg.ftsTable}(rowid, ${colNames}) VALUES (NEW.${cfg.contentRowid}, ${newCols});
           END;`
        );
        db.run(
          `CREATE TRIGGER IF NOT EXISTS ${cfg.contentTable}_ad AFTER DELETE ON ${cfg.contentTable} BEGIN
             INSERT INTO ${cfg.ftsTable}(${cfg.ftsTable}, rowid) VALUES('delete', OLD.${cfg.contentRowid});
           END;`
        );
        db.run(
          `CREATE TRIGGER IF NOT EXISTS ${cfg.contentTable}_au AFTER UPDATE ON ${cfg.contentTable} BEGIN
             INSERT INTO ${cfg.ftsTable}(${cfg.ftsTable}, rowid) VALUES('delete', OLD.${cfg.contentRowid});
             INSERT INTO ${cfg.ftsTable}(rowid, ${colNames}) VALUES (NEW.${cfg.contentRowid}, ${newCols});
           END;`
        );
      });

      db.close();
    }
  );
});

console.log('FTS migration completed.');
