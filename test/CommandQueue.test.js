const test = require('node:test');
const assert = require('node:assert/strict');
const { CommandQueue } = require('../CommandQueue');

test('processes up to batchSize items per tick', async () => {
  const q = new CommandQueue({ batchSize: 2 });
  let processed = 0;
  q.subscribe('cmd', async () => { processed++; });
  q.publish('cmd');
  q.publish('cmd');
  q.publish('cmd');

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(processed, 2);

  await q.drain();
  assert.equal(processed, 3);
});

test('requeues on listener error and pauses processing', async () => {
  const q = new CommandQueue({ batchSize: 2 });
  let firstAttempts = 0;
  let secondProcessed = 0;
  q.subscribe('cmd', async (data) => {
    if (data === 1) {
      firstAttempts++;
      if (firstAttempts === 1) throw new Error('fail');
    } else if (data === 2) {
      secondProcessed++;
    }
  });
  q.publish('cmd', 1);
  q.publish('cmd', 2);

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(firstAttempts, 1);
  assert.equal(secondProcessed, 0);

  await q.drain();
  assert.equal(firstAttempts, 2);
  assert.equal(secondProcessed, 1);
});

test('drain resolves when queue already empty', async () => {
  const q = new CommandQueue();
  await q.drain();
});
