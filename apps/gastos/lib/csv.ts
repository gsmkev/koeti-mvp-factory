// CSV export for team-scoped entities. Pair with an app/api/<entity>/export
// route that authenticates via session OR API key (see .claude/rules/crud.md):
//
//   const team = (await getTeamFromApiKey(request)) ?? (await getTeamForUser())
//   return csvResponse(toCsv(rows), 'things.csv')

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns?: (keyof T & string)[],
) {
  if (rows.length === 0) return '';
  const cols = columns ?? (Object.keys(rows[0]) as (keyof T & string)[]);
  const cell = (v: unknown) => {
    const s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');
}

export function csvResponse(csv: string, filename: string) {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
