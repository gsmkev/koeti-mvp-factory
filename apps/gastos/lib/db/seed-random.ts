// gastos lib — seed random.
import { seedRandom } from '@koeti/db/seed';
import { db } from './drizzle';
import * as schema from './schema';

// Fill this app's team-scoped tables with random data. Usage:
//   pnpm --filter @koeti/<name> db:seed:random [count]   (run db:seed first)
const count = Number(process.argv[2] ?? 25);

seedRandom(db, schema, { count })
  .then((seeded) => {
    if (seeded.length === 0) console.log('No team-scoped app tables to seed.');
    else for (const { table, rows } of seeded) console.log(`  ${table}: +${rows} rows`);
    console.log('Random seed complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Random seed failed:', err);
    process.exit(1);
  });
