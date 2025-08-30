const test = require('node:test');
const assert = require('node:assert/strict');
const sqlite3 = require('sqlite3').verbose();
const path = require('node:path');
const fs = require('node:fs');
const SearchEngine = require('../SearchEngine');

function createTempDb() {
  const name = `tmp-${process.pid}-${Math.random().toString(16).slice(2)}.sqlite`;
  const tmpPath = path.join(__dirname, '..', name);
  return new Promise((resolve, reject) => {
    const tmp = new sqlite3.Database(tmpPath);
    tmp.serialize(() => {
      tmp.run('CREATE TABLE t(id INTEGER)');
      tmp.close((err) => {
        if (err) reject(err); else resolve({ name, tmpPath });
      });
    });
  });
}

test('FTS MATCH and snippet highlighting works', async () => {
  const db = new sqlite3.Database(':memory:');
  await new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("CREATE VIRTUAL TABLE docs USING fts5(content)");
      const stmt = db.prepare("INSERT INTO docs(content) VALUES (?)");
      stmt.run('In the beginning God created the heaven and the earth');
      stmt.run('Jesus wept');
      stmt.finalize();
      db.all("SELECT snippet(docs, 0, '<b>', '</b>', '...', 10) AS snippet FROM docs WHERE docs MATCH ?", ['beginning'], (err, rows) => {
        if (err) return reject(err);
        try {
          assert.equal(rows.length, 1);
          assert.match(rows[0].snippet, /<b>beginning<\/b>/);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });
  db.close();
});

test('closes idle databases after timeout', async () => {
  const { name, tmpPath } = await createTempDb();
  const engine = new SearchEngine({ timeout: 50 });
  engine.databases.tmp = name;
  const conn1 = engine.getConnection('tmp');
  await new Promise((r) => setTimeout(r, 110));
  const conn2 = engine.getConnection('tmp');
  assert.notEqual(conn1, conn2);
  await new Promise((resolve) => {
    conn1.all('SELECT 1', (err) => {
      assert.ok(err);
      resolve();
    });
  });
  await new Promise((resolve) => conn2.close(resolve));
  fs.unlinkSync(tmpPath);
});

test('reuses prepared statements from cache', async () => {
  const { name, tmpPath } = await createTempDb();
  const engine = new SearchEngine();
  engine.databases.tmp = name;
  await engine.queryDatabase('tmp', 'SELECT 1', []);
  const stmt1 = engine.statementCache.get('tmp:SELECT 1');
  await engine.queryDatabase('tmp', 'SELECT 1', []);
  const stmt2 = engine.statementCache.get('tmp:SELECT 1');
  assert.equal(stmt1, stmt2);
  engine.statementCache.del('tmp:SELECT 1');
  const conn = engine.getConnection('tmp');
  await new Promise((resolve) => conn.close(resolve));
  fs.unlinkSync(tmpPath);
});
