import { prisma } from "../db/prisma";

export const clientRepository = {
  findByNameCaseInsensitive(name: string) {
    return prisma.client.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
  },

  create(name: string, passwordHash: string) {
    return prisma.client.create({
      data: { name, passwordHash, online: true, lastSeenAt: new Date() },
    });
  },

  findById(id: string) {
    return prisma.client.findUnique({ where: { id } });
  },

  findAll() {
    return prisma.client.findMany({ orderBy: { createdAt: "asc" } });
  },

  setOnline(id: string, online: boolean) {
    return prisma.client.update({
      where: { id },
      data: online ? { online, lastSeenAt: new Date() } : { online },
    });
  },
};
