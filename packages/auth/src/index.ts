// @koeti/auth — public entry (re-exports).
export {
  hashPassword,
  comparePasswords,
  signToken,
  verifyToken,
  getSession,
  setSession,
  signOneTimeToken,
  verifyOneTimeToken,
} from './session';
export { rateLimit } from './rate-limit';
export { generateApiKey, hashApiKey, apiKeyPrefix } from './api-key';
export { TEAM_ROLES, roleAtLeast, isSuperadmin } from './rbac';
export type { TeamRole } from './rbac';
export { validatedAction } from './middleware';
export type { ActionState } from './middleware';
export { createAuthMiddleware } from './create-middleware';
export { googleConfigured, googleAuthUrl, getGoogleProfile } from './oauth';
export type { GoogleProfile } from './oauth';
