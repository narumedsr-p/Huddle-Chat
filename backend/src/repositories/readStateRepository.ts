import { prisma } from "../db/prisma";

export const readStateRepository = {
  upsert(clientId: string, roomKey: string, lastReadAt: Date) {
    return prisma.readState.upsert({
      where: { clientId_roomKey: { clientId, roomKey } },
      update: { lastReadAt },
      create: { clientId, roomKey, lastReadAt },
    });
  },

  find(clientId: string, roomKey: string) {
    return prisma.readState.findUnique({ where: { clientId_roomKey: { clientId, roomKey } } });
  },
};
