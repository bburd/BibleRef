const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Map from absolute file path plus mode to open database instances
const pool = new Map();

function open(filePath, mode = sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE) {
  const full = path.resolve(filePath);
  const key = `${full}|${mode}`;
  if (pool.has(key)) return pool.get(key);
  const db = new sqlite3.Database(full, mode);
  pool.set(key, db);
  return db;
}

async function closeAll() {
  const entries = Array.from(pool.entries());
  pool.clear();
  await Promise.all(
    entries.map(([key, db]) =>
      new Promise((resolve, reject) => {
        db.close((err) => (err ? reject(err) : resolve()));
      })
    )
  );
}

let closing = false;
process.on('SIGINT', () => {
  if (closing) return;
  closing = true;
  closeAll()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
});

module.exports = { open, closeAll };
