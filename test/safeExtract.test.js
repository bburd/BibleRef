const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const tar = require('tar-stream');
const { safeExtract } = require('../utils/safeExtract');

test('ignores files with ../ paths', async () => {
  const pack = tar.pack();
  pack.entry({ name: '../evil.txt' }, 'evil');
  pack.finalize();

  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safex-'));
  const dest = path.join(baseDir, 'extract');
  fs.mkdirSync(dest);

  await safeExtract(pack, dest);
  assert.ok(fs.existsSync(path.join(dest, 'evil.txt')));
  assert.ok(!fs.existsSync(path.join(baseDir, 'evil.txt')));
});

test('ignores symlink entries', async () => {
  const pack = tar.pack();
  pack.entry({ name: 'link', type: 'symlink', linkname: '../evil.txt' });
  pack.finalize();

  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safex-'));
  const dest = path.join(baseDir, 'extract');
  fs.mkdirSync(dest);

  await safeExtract(pack, dest);

  assert.ok(!fs.existsSync(path.join(dest, 'link')));
  assert.ok(!fs.existsSync(path.join(baseDir, 'evil.txt')));
});
