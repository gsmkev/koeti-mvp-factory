// Ña Marta types a plain "usuario", not an email — but users.email (shared
// schema, must stay globally unique) needs something after the @. The
// suffix is a random, purely internal token with zero user-facing meaning:
// nobody types it, remembers it, or ever sees it. Two different despensas
// can each freely have a "juan" — sign-in finds every account matching
// "juan@%.fiado.local" and checks the password against each one (see
// (login)/actions.ts's signIn), disambiguating by despensa name only in the
// rare case more than one matches.
export function syntheticEmail(usuario: string) {
  const token = Math.random().toString(36).slice(2, 10);
  return `${usuario.toLowerCase()}@${token}.fiado.local`;
}
