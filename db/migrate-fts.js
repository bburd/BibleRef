const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Databases to process
const dbFiles = ['asvs.sqlite', 'kjv_strongs.sqlite'];

// Optionally rebuild the FTS index contents
const rebuild = process.argv.includes('--rebuild');

dbFiles.forEach((fileName) => {
  const filePath = path.join(__dirname, fileName);

  if (!fs.existsSync(filePath)) {
    console.warn(`Database not found: ${filePath}, skipping.`);
    return;
  }

  const db = new sqlite3.Database(filePath);

  db.all(`PRAGMA table_info(verses)`, (err, columns) => {
    if (err || columns.length === 0) {
      console.warn(`Table verses not found in ${filePath}, skipping.`);
      db.close();
      return;
    }

    const columnNames = columns.map((c) => c.name).filter((name) => name !== 'id');

    if (columnNames.length === 0) {
      console.warn(`No columns found for verses table in ${filePath}, skipping.`);
      db.close();
      return;
    }

    const colsDef = columnNames.join(', ');
    const colList = columnNames.join(', ');
    const newCols = columnNames.map((c) => `NEW.${c}`).join(', ');

    db.serialize(() => {
      db.run(
        `CREATE VIRTUAL TABLE IF NOT EXISTS verses_fts USING fts5(${colsDef}, content='verses', content_rowid='id')`
      );

      if (rebuild) {
        db.run(`INSERT INTO verses_fts(verses_fts) VALUES('rebuild')`);
      }

      db.run(
        `CREATE TRIGGER IF NOT EXISTS verses_ai AFTER INSERT ON verses BEGIN
           INSERT INTO verses_fts(rowid, ${colList}) VALUES (NEW.id, ${newCols});
         END;`
      );

      db.run(
        `CREATE TRIGGER IF NOT EXISTS verses_ad AFTER DELETE ON verses BEGIN
           INSERT INTO verses_fts(verses_fts, rowid) VALUES('delete', OLD.id);
         END;`
      );

      db.run(
        `CREATE TRIGGER IF NOT EXISTS verses_au AFTER UPDATE ON verses BEGIN
           INSERT INTO verses_fts(verses_fts, rowid) VALUES('delete', OLD.id);
           INSERT INTO verses_fts(rowid, ${colList}) VALUES (NEW.id, ${newCols});
         END;`,
        () => db.close()
      );
    });
  });
});

console.log('FTS migration completed.');

