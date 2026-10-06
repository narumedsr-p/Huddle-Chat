import { prisma } from "../db/prisma";

interface PageOpts {
  before?: Date;
  after?: Date;
  limit: number;
}

function timestampFilter(opts: PageOpts) {
  if (!opts.before && !opts.after) return undefined;
  return {
    ...(opts.before ? { lt: opts.before } : {}),
    ...(opts.after ? { gt: opts.after } : {}),
  };
}

export const messageRepository = {
  createGroupMessage(groupId: string, senderId: string, text: string) {
    return prisma.message.create({
      data: { groupId, senderId, text },
      include: { sender: true },
    });
  },

  createPrivateMessage(senderId: string, recipientId: string, text: string) {
    return prisma.message.create({
      data: { senderId, recipientId, text },
      include: { sender: true },
    });
  },

  listGroupMessages(groupId: string, opts: PageOpts) {
    return prisma.message.findMany({
      where: { groupId, timestamp: timestampFilter(opts) },
      include: { sender: true },
      orderBy: { timestamp: opts.after ? "asc" : "desc" },
      take: opts.limit,
    });
  },

  listPrivateMessages(a: string, b: string, opts: PageOpts) {
    return prisma.message.findMany({
      where: {
        OR: [
          { senderId: a, recipientId: b },
          { senderId: b, recipientId: a },
        ],
        timestamp: timestampFilter(opts),
      },
      include: { sender: true },
      orderBy: { timestamp: opts.after ? "asc" : "desc" },
      take: opts.limit,
    });
  },

  countUnreadForGroup(groupId: string, clientId: string, lastReadAt: Date) {
    return prisma.message.count({
      where: { groupId, timestamp: { gt: lastReadAt }, senderId: { not: clientId } },
    });
  },

  countUnreadForPrivate(selfId: string, otherId: string, lastReadAt: Date) {
    return prisma.message.count({
      where: { timestamp: { gt: lastReadAt }, senderId: otherId, recipientId: selfId },
    });
  },

  async distinctPrivateCounterparts(clientId: string) {
    const rows = await prisma.message.findMany({
      where: { recipientId: clientId },
      select: { senderId: true },
      distinct: ["senderId"],
    });
    return rows.map((r) => r.senderId);
  },
};
