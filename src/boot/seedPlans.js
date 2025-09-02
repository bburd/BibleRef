const fs = require('fs');
const path = require('path');
const { normalizeDays } = require('../lib/plan-normalize');

async function seedPlan(id, plan) {
  const planDefsPath = path.join(__dirname, '..', '..', 'plan_defs.json');
  let plans = [];
  try {
    const content = await fs.promises.readFile(planDefsPath, 'utf8');
    plans = JSON.parse(content);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  if (!plans.find(p => p.id === id)) {
    const days = normalizeDays(plan.days);
    plans.push({ id, ...plan, days });
    await fs.promises.writeFile(planDefsPath, JSON.stringify(plans, null, 2));
  }
}

async function seed() {
  const plan = {
    name: 'John 3-Day Plan',
    description: 'Demonstrates complex plan structures',
    days: [
      'John 1',
      ['John 2', 'John 3'],
      {
        readings: [
          { book: 'John', chapter: 4, verses: [4, 5, 6], title: 'At the well' },
          { ref: 'John 4:7-10', note: 'Conversation' }
        ],
        _meta: { topic: 'Living water' }
      }
    ],
  };
  await seedPlan('j3', plan);
}

module.exports = { seed };

if (require.main === module) {
  seed().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
