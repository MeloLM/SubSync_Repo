import { PrismaClient } from "@/lib/generated/prisma";

// Singleton del Prisma Client: evita di esaurire le connessioni in dev
// (hot reload) creando una nuova istanza a ogni ricompilazione.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
