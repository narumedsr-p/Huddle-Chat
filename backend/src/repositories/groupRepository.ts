import { prisma } from "../db/prisma";

const withMembers = { members: true } as const;

export const groupRepository = {
  findByNameCaseInsensitive(name: string) {
    return prisma.group.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
  },

  findAllWithMembers() {
    return prisma.group.findMany({ include: withMembers, orderBy: { createdAt: "asc" } });
  },

  findByIdWithMembers(id: string) {
    return prisma.group.findUnique({ where: { id }, include: withMembers });
  },

  async create(name: string, createdBy: string) {
    const group = await prisma.group.create({ data: { name, createdBy } });
    await prisma.groupMember.create({ data: { groupId: group.id, clientId: createdBy } });
    return groupRepository.findByIdWithMembers(group.id);
  },

  async isMember(groupId: string, clientId: string) {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_clientId: { groupId, clientId } },
    });
    return !!membership;
  },

  addMember(groupId: string, clientId: string) {
    return prisma.groupMember.create({ data: { groupId, clientId } });
  },

  removeMember(groupId: string, clientId: string) {
    return prisma.groupMember
      .delete({ where: { groupId_clientId: { groupId, clientId } } })
      .catch(() => null);
  },
};
