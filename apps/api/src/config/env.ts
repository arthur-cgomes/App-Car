import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().default(3000),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1).default('redis://localhost:6379/0'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter ao menos 32 caracteres'),
    CORS_ORIGIN: z.string().default('http://localhost:3001'),
    WEB_URL: z.string().url().default('http://localhost:3001'),
    TRUST_PROXY: z.coerce.number().int().min(0).default(1),
    REFRESH_COOKIE_PATH: z.string().default('/api/v1/auth'),
    SMS_PROVIDER: z.enum(['console', 'smsdev', 'disabled']).default('console'),
    SMSDEV_KEY: z.string().optional(),
    PLATE_PROVIDER: z.enum(['mock', 'none']).default('mock'),
    PLATE_LOOKUP_DAILY_LIMIT: z.coerce.number().int().min(1).default(10),
    STORAGE_PROVIDER: z.enum(['s3', 'gdrive']).default('s3'),
    GOOGLE_DRIVE_CLIENT_ID: z.string().optional(),
    GOOGLE_DRIVE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_DRIVE_REFRESH_TOKEN: z.string().optional(),
    GOOGLE_DRIVE_FOLDER_ID: z.string().optional(),
    S3_ENDPOINT: z.string().url().optional(),
    S3_REGION: z.string().default('us-east-1'),
    S3_BUCKET: z.string().default('placar'),
    S3_ACCESS_KEY: z.string().default('local'),
    S3_SECRET_KEY: z.string().default('local12345'),
    FIPE_PROVIDER: z.enum(['parallelum', 'mock']).default('parallelum'),
    FIPE_TOKEN: z.string().optional(),
    SMTP_URL: z.string().default('smtp://localhost:1025'),
    MAIL_FROM: z.string().default('VW Polo <nao-responda@appcar.local>'),
  })
  .refine((env) => env.SMS_PROVIDER !== 'smsdev' || env.SMSDEV_KEY, {
    message: 'SMSDEV_KEY é obrigatória com SMS_PROVIDER=smsdev',
  })
  .refine(
    (env) =>
      env.STORAGE_PROVIDER !== 'gdrive' ||
      (env.GOOGLE_DRIVE_CLIENT_ID && env.GOOGLE_DRIVE_CLIENT_SECRET && env.GOOGLE_DRIVE_REFRESH_TOKEN && env.GOOGLE_DRIVE_FOLDER_ID),
    { message: 'Com STORAGE_PROVIDER=gdrive defina GOOGLE_DRIVE_CLIENT_ID, _CLIENT_SECRET, _REFRESH_TOKEN e _FOLDER_ID' },
  )
  .refine((env) => env.NODE_ENV !== 'production' || env.PLATE_PROVIDER !== 'mock', {
    message: 'Em produção a consulta simulada de placa não é permitida (PLATE_PROVIDER=none)',
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.SMS_PROVIDER !== 'console', {
    message: 'Em produção use SMS_PROVIDER=smsdev ou SMS_PROVIDER=disabled',
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Variáveis de ambiente inválidas:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
