import { createApp } from "./app";
import { prisma } from "./db/prisma";
import { clientRepository } from "./repositories/clientRepository";

const PORT = Number(process.env.PORT ?? 4000);
const HEARTBEAT_TIMEOUT_MS = 45_000;
const SWEEP_INTERVAL_MS = 15_000;

async function main() {
  const app = await createApp();

  app.listen(PORT, () => {
    console.log(`backend listening on :${PORT}`);
  });

  setInterval(() => {
    clientRepository.markStaleOffline(new Date(Date.now() - HEARTBEAT_TIMEOUT_MS)).catch((err) => {
      console.error("presence sweep failed", err);
    });
  }, SWEEP_INTERVAL_MS);
}

main().catch((err) => {
  console.error("failed to start backend", err);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
