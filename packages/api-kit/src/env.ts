import { z } from 'zod'

/**
 * Validate environment variables against a Zod schema.
 * Exits the process with clear error messages if validation fails.
 */
export function parseEnv<T extends z.ZodRawShape>(schema: z.ZodObject<T>): z.infer<z.ZodObject<T>> {
  try {
    return schema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation failed:')
      for (const err of error.errors) {
        console.error(`  ${err.path.join('.')}: ${err.message}`)
      }
    }
    process.exit(1)
  }
}

/** Base env schema — every app gets these for free. Extend with .merge() */
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
})
