import { app } from "./app";
import prisma, { testPlatformDbConnection } from "./config/prisma";
import { env } from "./config/env";

async function startServer(): Promise<void> {
  await testPlatformDbConnection();
  console.log("Connected to platform PostgreSQL database.");

  app.listen(env.port, () => {
    console.log(`Server is running on http://localhost:${env.port}`);
  });
}

startServer().catch(async (error: unknown) => {
  console.error("Failed to start server.", error);
  await prisma.$disconnect();
  process.exit(1);
});
