import { createApp } from "./app";
import { prisma } from "./db/prisma";
import { attachWebSocketServer } from "./ws/server";

const PORT = Number(process.env.PORT ?? 4000);

async function main() {
  const app = await createApp();
  // HTTP and WS share one listening socket — the upgrade handshake (RFC 6455
  // §4) rides in on the same TCP connection as the original GET, so there's
  // only one server to bind, not two.
  const server = app.listen(PORT, () => {
    console.log(`backend listening on :${PORT}`);
  });
  attachWebSocketServer(server);
}

main().catch((err) => {
  console.error("failed to start backend", err);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
