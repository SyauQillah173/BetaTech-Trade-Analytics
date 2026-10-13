import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

export function resolveDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('your-project-ref')) {
    return process.env.DATABASE_URL;
  }
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
      if (match && match[1]) {
        process.env.DATABASE_URL = match[1];
        return match[1];
      }
    }
  } catch {
    // ignore
  }
  return process.env.DATABASE_URL;
}

const activeUrl = resolveDatabaseUrl();

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: activeUrl ? { db: { url: activeUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

