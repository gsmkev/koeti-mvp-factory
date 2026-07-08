// API route (GET) — /api/openapi.
import { openApiSpec } from '@/lib/openapi';

// Serves the OpenAPI spec as JSON; consumed by /api-docs (Swagger UI) and any
// external tooling (Postman, codegen).
export function GET() {
  return Response.json(openApiSpec);
}
