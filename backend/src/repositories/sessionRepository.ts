import { prisma } from "../db/prisma";

export const sessionRepository = {
  create(token: string, clientId: string) {
    return prisma.session.create({ data: { token, clientId } });
  },

  findByToken(token: string) {
    return prisma.session.findUnique({
      where: { token },
      include: { client: true },
    });
  },

  deleteByToken(token: string) {
    return prisma.session.delete({ where: { token } }).catch(() => null);
  },
};
