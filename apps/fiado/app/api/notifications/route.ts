// API route — /api/notifications. GET: recent items + unread count for the
// signed-in user (the bell polls this via SWR). POST: mark all read (bell
// dropdown opened).
import { getUser } from '@/lib/db/queries';
import { getNotificationsForUser, markAllNotificationsRead } from '@/lib/notifications';

export async function GET() {
  const user = await getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  return Response.json(await getNotificationsForUser(user.id));
}

export async function POST() {
  const user = await getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  await markAllNotificationsRead(user.id);
  return Response.json({ ok: true });
}
