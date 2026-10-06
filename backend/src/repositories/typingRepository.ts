import { prisma } from "../db/prisma";

const TYPING_TTL_MS = 5000;

export const typingRepository = {
  setTyping(clientId: string, roomKey: string) {
    return prisma.typingState.upsert({
      where: { clientId_roomKey: { clientId, roomKey } },
      update: { updatedAt: new Date() },
      create: { clientId, roomKey },
    });
  },

  clearTyping(clientId: string, roomKey: string) {
    return prisma.typingState
      .delete({ where: { clientId_roomKey: { clientId, roomKey } } })
      .catch(() => null);
  },

  listActiveTypers(roomKey: string, excludeClientId: string) {
    return prisma.typingState.findMany({
      where: {
        roomKey,
        clientId: { not: excludeClientId },
        updatedAt: { gt: new Date(Date.now() - TYPING_TTL_MS) },
      },
      include: { client: true },
    });
  },
};
