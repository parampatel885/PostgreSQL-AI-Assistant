import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = [
  "DATABASE_URL",
  "ENCRYPTION_KEY",
  "FRONTEND_URL",
  "OPENROUTER_API_KEY",
] as const;

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const encryptionKey = process.env.ENCRYPTION_KEY as string;
if (encryptionKey.length !== 32) {
  throw new Error("ENCRYPTION_KEY must be exactly 32 characters.");
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL as string,
};
