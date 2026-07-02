import Link from 'next/link';
import { Button } from '@koeti/ui';

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <div className="max-w-md space-y-6 text-center">
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground">
          The page you are looking for doesn&apos;t exist or was moved.
        </p>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
