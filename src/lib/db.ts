import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Vercel serverless environment fallback
  if (process.env.VERCEL) {
    const tmpDbPath = "/tmp/dev.db";
    const prismaDirDb = path.join(process.cwd(), "prisma", "dev.db");

    if (!fs.existsSync(tmpDbPath) && fs.existsSync(prismaDirDb)) {
      try {
        fs.copyFileSync(prismaDirDb, tmpDbPath);
      } catch (err) {
        console.error("Vercel DB copy failed:", err);
      }
    }
    return `file:${tmpDbPath}`;
  }

  return "file:./dev.db";
}

const databaseUrl = getDatabaseUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
