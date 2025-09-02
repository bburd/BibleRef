const fs = require('fs');
const path = require('path');
const plansDb = require('../db/plans');
const { normalizePlan } = require('../lib/plan-normalize');

async function loadJson(file) {
  try {
    const data = await fs.promises.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      const msg = err instanceof SyntaxError ? 'Malformed JSON' : err.message;
      console.error(`${msg}: ${file}`);
    }
    return null;
  }
}

async function gatherPlans() {
  const root = path.join(__dirname, '..', '..');
  const plansDir = path.join(root, 'plans');
  const planDefsFile = path.join(root, 'plan_defs.json');
  const plans = [];

  const defs = await loadJson(planDefsFile);
  if (Array.isArray(defs)) plans.push(...defs);

  try {
    const entries = await fs.promises.readdir(plansDir);
    for (const f of entries.filter((e) => e.endsWith('.json'))) {
      const plan = await loadJson(path.join(plansDir, f));
      if (plan) {
        if (!plan.id) plan.id = path.basename(f, '.json');
        plans.push(plan);
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(`Failed reading plans dir: ${err.message}`);
  }
  return plans;
}

async function seedAll() {
  const plans = await gatherPlans();
  let inserted = 0;
  let updated = 0;
  for (const plan of plans) {
    try {
      const norm = normalizePlan(plan);
      const res = await plansDb.upsertPlanDef(norm);
      if (res === 'updated') updated++;
      else inserted++;
    } catch (err) {
      console.error(`Failed to upsert plan ${plan.id}:`, err);
    }
  }
  console.log(`Inserted ${inserted} plans, updated ${updated} plans`);
}

module.exports = { seedAll };

if (require.main === module) {
  seedAll().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
