const fs = require('fs');
const path = require('path');

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
    plans.push({ id, ...plan });
    await fs.promises.writeFile(planDefsPath, JSON.stringify(plans, null, 2));
  }
}

async function seed() {
  const plan = {
    name: 'John 7-Day Plan',
    description: 'Read John 1-7 over a week',
    days: ['John 1', 'John 2', 'John 3', 'John 4', 'John 5', 'John 6', 'John 7'],
  };
  await seedPlan('j7', plan);
}

module.exports = { seed };
