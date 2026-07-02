import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@koeti/ui';

const MODULES = [
  {
    tag: 'registro',
    title: 'Cada gasto, en segundos',
    description:
      'Monto, categoría, descripción y fecha. Un formulario directo, sin pasos de más.',
  },
  {
    tag: 'categorías',
    title: 'Clasificado desde el inicio',
    description:
      'Viáticos, materiales, software y otros. Cada registro queda ordenado para revisarlo después.',
  },
  {
    tag: 'equipo',
    title: 'Todo el equipo, una cuenta',
    description:
      'Los gastos viven en el equipo, no en la laptop de alguien. Invita a tu gente con roles claros.',
  },
] as const;

function LedgerPreview() {
  const rows = [
    { cat: 'viáticos', desc: 'Viaje CDMX — cliente', amount: '$2,450.00' },
    { cat: 'software', desc: 'Licencias anuales', amount: '$1,180.00' },
    { cat: 'materiales', desc: 'Impresiones y papelería', amount: '$312.50' },
  ];
  return (
    <div className="mx-auto w-full max-w-sm lg:mx-0">
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Este mes
          </span>
          <span className="font-display text-sm font-semibold tabular-nums text-success">
            $3,942.50
          </span>
        </div>
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.desc} className="flex items-center gap-3 px-4 py-3">
              <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                {row.cat}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {row.desc}
              </span>
              <span className="text-sm font-medium tabular-nums">{row.amount}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.4] [mask-image:linear-gradient(to_bottom,black,transparent)]"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative mx-auto grid max-w-6xl gap-16 px-6 py-24 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-32">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Control de gastos
            </p>
            <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
              Los gastos de tu equipo, bajo control.
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">
              Registra cada gasto, clasifícalo por categoría y consulta el total
              del mes sin abrir una hoja de cálculo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/sign-up">Empezar gratis</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/pricing">Ver precios</Link>
              </Button>
            </div>
          </div>

          <LedgerPreview />
        </div>
      </section>

      <section className="border-b border-border py-20">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {MODULES.map((mod) => (
              <Card key={mod.tag}>
                <CardHeader>
                  <span className="font-mono text-xs text-muted-foreground">
                    [{mod.tag}]
                  </span>
                  <CardTitle className="text-lg">{mod.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {mod.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6 text-center sm:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Deja la hoja de cálculo hoy.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-muted-foreground">
            Tu equipo registra, Gastos suma. Al cierre del mes ya sabes en qué
            se fue el dinero.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/sign-up">Crear cuenta</Link>
            </Button>
            <Link
              href="/sign-in"
              className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              ¿Ya tienes cuenta? Inicia sesión
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
