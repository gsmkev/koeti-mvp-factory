import { baseSchema } from '@koeti/db'
import * as appSchema from './schema'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const client = postgres(process.env.POSTGRES_URL!)
export const db = drizzle(client, { schema: { ...baseSchema, ...appSchema } })
