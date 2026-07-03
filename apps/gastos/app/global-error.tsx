'use client';

// Catches errors in the root layout itself — must render its own <html>/<body>
// and stay dependency-free (no app CSS is guaranteed to load here).
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ fontFamily: 'sans-serif', display: 'grid', placeItems: 'center', minHeight: '100dvh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Algo salió mal</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
            {error.digest ? `Ref: ${error.digest}` : 'Ocurrió un error inesperado.'}
          </p>
          <button
            onClick={reset}
            style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
