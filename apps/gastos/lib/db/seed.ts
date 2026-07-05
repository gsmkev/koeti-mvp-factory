// gastos lib — seed.
import { stripe } from '../payments/stripe';
import { db } from './drizzle';
import { users, teams, teamMembers } from '@koeti/db';
import { hashPassword } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';

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

async function seed() {
  const email = 'test@test.com';
  const password = 'admin123';

  // Idempotent: safe to re-run after a partial seed
  const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existingUser) {
    console.log(`Test user ${email} already exists — skipping user/team seed.`);
  } else {
    const [user] = await db
      .insert(users)
      .values([{ email, passwordHash: await hashPassword(password), role: 'owner' }])
      .returning();
    const [team] = await db.insert(teams).values({ name: 'Test Team' }).returning();
    await db.insert(teamMembers).values({ teamId: team.id, userId: user.id, role: 'owner' });
    console.log(`Test user created: ${email} / ${password}`);
  }

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
