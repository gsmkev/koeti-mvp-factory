import { defineConfig } from 'drizzle-kit'
import dotenv from 'dotenv'

dotenv.config({ path: ['.env.local', '.env'] })

export default defineConfig({
  schema: ['../../packages/db/src/schema.ts', './lib/db/schema.ts'],
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.POSTGRES_URL! },
})
