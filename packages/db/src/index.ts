export * from './schema'

// Grouped export for spreading into app drizzle instances
import * as schema from './schema'
export const baseSchema = schema
