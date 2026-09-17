export function validateEnvironment(env: Record<string, unknown>) {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválido');
  const databaseUrl = String(env.DATABASE_URL ?? '');
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL debe apuntar a PostgreSQL');
  const origin = String(env.CORS_ORIGIN ?? 'http://localhost:5173');
  const parsed = new URL(origin);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) throw new Error('CORS_ORIGIN debe ser un origen HTTP válido');
  const secret = String(env.JWT_SECRET ?? '');
  if (secret.length < 32 || secret.startsWith('replace_with_')) throw new Error('JWT_SECRET requiere un secreto local de al menos 32 caracteres');
  const expiresIn = Number(env.JWT_EXPIRES_IN ?? 3600);
  if (!Number.isSafeInteger(expiresIn) || expiresIn <= 0) throw new Error('JWT_EXPIRES_IN debe ser un número positivo de segundos');
  return { ...env, PORT: port, DATABASE_URL: databaseUrl, CORS_ORIGIN: origin, JWT_SECRET: secret, JWT_EXPIRES_IN: expiresIn };
}
