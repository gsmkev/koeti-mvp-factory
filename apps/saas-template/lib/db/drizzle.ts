import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { baseSchema } from '@koeti/db'
import * as appSchema from './schema'
import dotenv from 'dotenv'

dotenv.config({ path: ['.env.local', '.env'] })

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set')
}

export const client = postgres(process.env.POSTGRES_URL)
export const db = drizzle(client, { schema: { ...baseSchema, ...appSchema } })
