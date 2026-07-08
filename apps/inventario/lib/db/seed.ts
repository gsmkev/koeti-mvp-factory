// saas-template lib — seed.
import { stripe } from '../payments/stripe';
import { db } from './drizzle';
import { users, teams, teamMembers } from '@koeti/db';
import type { TeamRole } from '@koeti/auth';
import { hashPassword } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';
import { products, warehouses, warehouseAssignments, suppliers, stockMovements } from './schema';

async function createStripeProducts() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log(
      'STRIPE_SECRET_KEY not set — skipping Stripe products (pricing page will be empty).',
    );
    return;
  }

  const existing = await stripe.products.list({ active: true, limit: 1 });
  if (existing.data.length > 0) {
    console.log('Stripe products already exist — skipping.');
    return;
  }

  console.log('Creating Stripe products and prices...');
  for (const [name, unitAmount] of [
    ['Base', 800],
    ['Plus', 1200],
  ] as const) {
    const product = await stripe.products.create({
      name,
      description: `${name} subscription plan`,
    });
    await stripe.prices.create({
      product: product.id,
      unit_amount: unitAmount,
      currency: 'usd',
      recurring: { interval: 'month', trial_period_days: 7 },
    });
  }
  console.log('Stripe products and prices created.');
}

// One extra user per business role (spec Decision #13) — all password admin123.
const EXTRA_USERS: { email: string; role: TeamRole }[] = [
  { email: 'manager@test.com', role: 'admin' }, // "manager": approves POs/adjustments
  { email: 'almacenero@test.com', role: 'member' }, // scoped to one warehouse below
  { email: 'viewer@test.com', role: 'viewer' }, // read-only reports
];

async function seedUsers(teamId: number) {
  const ids: Record<string, number> = {};
  for (const { email, role } of EXTRA_USERS) {
    let user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user) {
      [user] = await db
        .insert(users)
        .values({ email, passwordHash: await hashPassword('admin123') })
        .returning();
      await db.insert(teamMembers).values({ teamId, userId: user.id, role });
      console.log(`Test user created: ${email} / admin123 (${role})`);
    }
    ids[email] = user.id;
  }
  return ids;
}

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)];

const WAREHOUSE_NAMES = ['Depósito Central', 'Sucursal Norte', 'Sucursal Sur'];
const SUPPLIER_NAMES = [
  'Proveedora ABC',
  'Distribuidora XYZ',
  'Importadora del Sur',
  'Mayorista Central',
];

const PRODUCT_SEEDS = [
  {
    sku: 'BEB-001',
    name: 'Agua Mineral 500ml',
    category: 'Bebidas',
    unit: 'unidad',
    cost: 3,
    price: 5,
    minStock: 50,
    perishable: false,
  },
  {
    sku: 'BEB-002',
    name: 'Gaseosa Cola 1.5L',
    category: 'Bebidas',
    unit: 'unidad',
    cost: 6,
    price: 10,
    minStock: 40,
    perishable: false,
  },
  {
    sku: 'ALM-001',
    name: 'Arroz 1kg',
    category: 'Almacén',
    unit: 'unidad',
    cost: 4,
    price: 7,
    minStock: 30,
    perishable: false,
  },
  {
    sku: 'ALM-002',
    name: 'Fideos 500g',
    category: 'Almacén',
    unit: 'unidad',
    cost: 2.5,
    price: 4.5,
    minStock: 30,
    perishable: false,
  },
  {
    sku: 'LAC-001',
    name: 'Leche Entera 1L',
    category: 'Lácteos',
    unit: 'unidad',
    cost: 3.5,
    price: 6,
    minStock: 25,
    perishable: true,
  },
  {
    sku: 'LAC-002',
    name: 'Yogur Natural 900g',
    category: 'Lácteos',
    unit: 'unidad',
    cost: 5,
    price: 8.5,
    minStock: 20,
    perishable: true,
  },
  {
    sku: 'LIM-001',
    name: 'Detergente 900ml',
    category: 'Limpieza',
    unit: 'unidad',
    cost: 4,
    price: 7.5,
    minStock: 20,
    perishable: false,
  },
  {
    sku: 'LIM-002',
    name: 'Lavandina 1L',
    category: 'Limpieza',
    unit: 'unidad',
    cost: 2,
    price: 4,
    minStock: 20,
    perishable: false,
  },
  {
    sku: 'ELE-001',
    name: 'Pilas AA (pack 4)',
    category: 'Electrónica',
    unit: 'pack',
    cost: 8,
    price: 14,
    minStock: 15,
    perishable: false,
  },
  {
    sku: 'ELE-002',
    name: 'Cable USB-C',
    category: 'Electrónica',
    unit: 'unidad',
    cost: 6,
    price: 12,
    minStock: 15,
    perishable: false,
  },
  {
    sku: 'PAN-001',
    name: 'Pan Lactal',
    category: 'Panadería',
    unit: 'unidad',
    cost: 3,
    price: 5.5,
    minStock: 20,
    perishable: true,
  },
  {
    sku: 'FRU-001',
    name: 'Manzana Roja (kg)',
    category: 'Frutas y Verduras',
    unit: 'kg',
    cost: 2.5,
    price: 4.5,
    minStock: 30,
    perishable: true,
  },
] as const;

// Force a few predictable scenarios so the low-stock / expiring-soon reports
// have something to show right after seeding, instead of relying on luck.
const FORCE_LOW_STOCK: readonly string[] = ['BEB-002', 'LIM-001', 'ELE-002'];
const FORCE_EXPIRING_SOON: readonly string[] = ['LAC-001', 'PAN-001'];

async function seedInventario(teamId: number, ownerId: number, almaceneroId: number) {
  const already = await db
    .select({ id: warehouses.id })
    .from(warehouses)
    .where(eq(warehouses.teamId, teamId))
    .limit(1);
  if (already.length > 0) {
    console.log('Inventario demo data already exists — skipping.');
    return;
  }

  const warehouseRows = await db
    .insert(warehouses)
    .values(WAREHOUSE_NAMES.map((name) => ({ teamId, name })))
    .returning();
  await db.insert(warehouseAssignments).values({
    teamId,
    userId: almaceneroId,
    warehouseId: warehouseRows[0].id,
  });

  await db.insert(suppliers).values(SUPPLIER_NAMES.map((name) => ({ teamId, name })));

  for (const p of PRODUCT_SEEDS) {
    const [product] = await db
      .insert(products)
      .values({
        teamId,
        sku: p.sku,
        name: p.name,
        category: p.category,
        unit: p.unit,
        cost: p.cost,
        avgCost: p.cost,
        price: p.price,
        minStock: p.minStock,
      } as unknown as typeof products.$inferInsert)
      .returning();

    const warehouse = pick(warehouseRows);
    const forceLow = FORCE_LOW_STOCK.includes(p.sku);
    const forceExpiring = FORCE_EXPIRING_SOON.includes(p.sku);
    const initialQty = forceLow ? rand(1, p.minStock - 1) : rand(p.minStock, p.minStock * 4);

    await db.insert(stockMovements).values({
      teamId,
      productId: product.id,
      warehouseId: warehouse.id,
      type: 'purchase',
      quantity: initialQty,
      unitCost: p.cost,
      batchNumber: p.perishable ? `LOTE-${rand(1000, 9999)}` : null,
      expiresAt: p.perishable
        ? new Date(Date.now() + (forceExpiring ? rand(2, 20) : rand(45, 120)) * 86_400_000)
            .toISOString()
            .slice(0, 10)
        : null,
      note: 'Stock inicial (seed)',
      createdBy: ownerId,
    } as unknown as typeof stockMovements.$inferInsert);

    // A bit of movement history so the ledger/filters have real variety.
    if (!forceLow && rand(0, 1) === 1) {
      await db.insert(stockMovements).values({
        teamId,
        productId: product.id,
        warehouseId: warehouse.id,
        type: 'sale',
        quantity: rand(1, Math.max(1, Math.floor(initialQty / 3))),
        note: 'Venta (seed)',
        createdBy: pick([ownerId, almaceneroId]),
      } as typeof stockMovements.$inferInsert);
    }
  }
  console.log(
    `Seeded ${WAREHOUSE_NAMES.length} warehouses, ${SUPPLIER_NAMES.length} suppliers, ${PRODUCT_SEEDS.length} products with stock movements.`,
  );
}

async function seed() {
  const email = 'test@test.com';
  const password = 'admin123';

  // Idempotent: safe to re-run after a partial seed
  let team = await db.query.teams.findFirst({ where: eq(teams.name, 'Test Team') });
  const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });
  let ownerId: number;
  if (existingUser && team) {
    console.log(`Test user ${email} already exists — skipping user/team seed.`);
    ownerId = existingUser.id;
  } else {
    const [user] = await db
      .insert(users)
      .values([{ email, passwordHash: await hashPassword(password) }])
      .returning();
    [team] = await db
      .insert(teams)
      .values({ name: 'Test Team', onboardingCompletedAt: new Date() })
      .returning();
    await db.insert(teamMembers).values({ teamId: team.id, userId: user.id, role: 'owner' });
    console.log(`Test user created: ${email} / ${password} (owner)`);
    ownerId = user.id;
  }

  const extraIds = await seedUsers(team!.id);
  await seedInventario(team!.id, ownerId, extraIds['almacenero@test.com']);
  await createStripeProducts();
}

seed()
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Seed process finished. Exiting...');
    process.exit(0);
  });
