// saas-template lib — seed.
//
// No Stripe product seeding here: fiado bills exclusively in guaraníes via
// Pagopar (see billing.md), whose catalog is env-defined (PAGOPAR_PLANS),
// not a Stripe product API call — nothing to seed.
import { db } from './drizzle';
import { users, teams, teamMembers } from '@koeti/db';
import { hashPassword } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';

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
      .values([{ email, passwordHash: await hashPassword(password) }])
      .returning();
    const [team] = await db
      .insert(teams)
      .values({ name: 'Test Team', onboardingCompletedAt: new Date() })
      .returning();
    await db.insert(teamMembers).values({ teamId: team.id, userId: user.id, role: 'owner' });
    console.log(`Test user created: ${email} / ${password}`);
  }
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
