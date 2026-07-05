// Page — route /onboarding: name the workspace + optional invites after sign-up.
// Always renders (idempotent form); the (dashboard) layout is what routes
// un-onboarded owners here.
import { requireRole } from '@/lib/auth/middleware';
import { OnboardingForm } from './onboarding-form';

export default async function OnboardingPage() {
  const { team } = await requireRole('viewer');
  return <OnboardingForm defaultName={team.name} />;
}
