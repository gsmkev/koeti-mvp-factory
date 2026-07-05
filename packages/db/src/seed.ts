// @koeti/db — seed.
import { faker } from '@faker-js/faker';
import { getTableColumns, getTableName, is, Table } from 'drizzle-orm';
import { teams } from './schema';

// ponytail: db typed `any` — drizzle's insert/select generics per-app aren't worth
// threading through a generic seeder. Runtime shape is all we use.
type Db = any;

/**
 * Fill every team-scoped app table with random rows, no per-app config.
 * Introspects the Drizzle schema: any table with a `teamId` column gets `count`
 * rows per existing team, values chosen by column type + name heuristics.
 * Base tables (users/teams/…) are skipped — run `db:seed` for those first.
 */
export async function seedRandom(db: Db, schema: Record<string, unknown>, { count = 25 } = {}) {
  const teamRows: { id: number }[] = await db.select().from(teams);
  if (teamRows.length === 0) throw new Error('No teams found — run `pnpm db:seed` first.');

  const seeded: { table: string; rows: number }[] = [];
  const tables = Object.values(schema).filter((t): t is Table => is(t, Table));
  for (const table of tables) {
    const cols = getTableColumns(table);
    if (!('teamId' in cols)) continue; // only team-scoped app tables

    for (const team of teamRows) {
      const rows = Array.from({ length: count }, () => buildRow(cols, team.id));
      await db.insert(table).values(rows);
    }
    seeded.push({ table: getTableName(table), rows: count * teamRows.length });
  }
  return seeded;
}

function buildRow(cols: Record<string, any>, teamId: number) {
  const row: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(cols)) {
    if (col.primary || col.hasDefault) continue; // serial ids, createdAt defaultNow, etc.
    if (key === 'teamId') {
      row[key] = teamId;
      continue;
    }
    row[key] = fakeValue(key, col);
  }
  return row;
}

function fakeValue(key: string, col: any): unknown {
  // pgEnum: pick a real allowed value for free
  if (Array.isArray(col.enumValues) && col.enumValues.length)
    return faker.helpers.arrayElement(col.enumValues);

  // Decide by columnType first — Drizzle reports numeric/date as dataType 'string'.
  const ct: string = col.columnType ?? '';
  if (/numeric|decimal/i.test(ct)) return faker.commerce.price({ min: 1, max: 9999 }); // string, 2 decimals
  if (/date/i.test(ct)) return faker.date.recent({ days: 90 }).toISOString().slice(0, 10); // PgDate/PgDateString → 'YYYY-MM-DD'
  if (/timestamp/i.test(ct)) return faker.date.recent({ days: 90 });

  const n = key.toLowerCase();
  const cap = (s: string) => (typeof col.length === 'number' ? s.slice(0, col.length) : s);

  switch (col.dataType) {
    case 'boolean':
      return faker.datatype.boolean();
    case 'date':
      return faker.date.recent({ days: 90 });
    case 'bigint':
    case 'number':
      return faker.number.int({ min: 1, max: 1000 });
    case 'string': {
      let v: string;
      if (/email/.test(n)) v = faker.internet.email();
      else if (/company|org|team|business/.test(n)) v = faker.company.name();
      else if (/name/.test(n)) v = faker.person.fullName();
      else if (/desc|note|comment|message|body|summary/.test(n)) v = faker.lorem.sentence();
      else if (/title|subject|headline/.test(n)) v = faker.lorem.words(4);
      else if (/category|type|status|kind|label|tag|state/.test(n)) v = faker.word.noun();
      else if (/url|link|website|href/.test(n)) v = faker.internet.url();
      else if (/phone|tel|mobile/.test(n)) v = faker.phone.number();
      else if (/city/.test(n)) v = faker.location.city();
      else if (/country/.test(n)) v = faker.location.country();
      else if (/address|street/.test(n)) v = faker.location.streetAddress();
      else if (/color/.test(n)) v = faker.color.human();
      else if (/slug/.test(n)) v = faker.lorem.slug();
      else v = faker.lorem.words(3);
      return cap(v);
    }
    case 'json':
      return { note: faker.lorem.sentence() };
    default:
      return faker.lorem.word();
  }
}
