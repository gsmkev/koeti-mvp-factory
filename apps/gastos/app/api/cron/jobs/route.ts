// Background-job sweep. Vercel cron (see vercel.json) calls this every 5
// minutes with Authorization: Bearer ${CRON_SECRET}; run it locally with curl
// the same way. Claims due jobs atomically (FOR UPDATE SKIP LOCKED), so an
// overlapping sweep never double-runs a job.
import { runJobs } from '@koeti/db';
import { db } from '@/lib/db/drizzle';
import { jobHandlers } from '@/lib/jobs';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  return Response.json(await runJobs(db, jobHandlers, 25));
}
