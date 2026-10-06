import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FEATURED: { name: string; online: boolean }[] = [
  { name: "Nara", online: true },
  { name: "Ploy", online: true },
  { name: "Tar", online: true },
  { name: "Fah", online: false },
  { name: "Korn", online: false },
];

const GROUPS: { name: string; createdBy: string; memberNames: string[] }[] = [
  { name: "Monkey Business", createdBy: "Nara", memberNames: ["Nara", "Ploy"] },
  { name: "Banana Republic", createdBy: "Tar", memberNames: ["Tar", "Fah", "Korn"] },
  { name: "Jungle Devs", createdBy: "Nara", memberNames: ["Nara", "Tar"] },
];

async function main() {
  const clientIdByName = new Map<string, string>();

  for (const { name, online } of FEATURED) {
    const client = await prisma.client.upsert({
      where: { name },
      update: { online },
      create: { name, online },
    });
    clientIdByName.set(name, client.id);
  }

  for (const { name, createdBy, memberNames } of GROUPS) {
    const creatorId = clientIdByName.get(createdBy)!;
    const group = await prisma.group.upsert({
      where: { name },
      update: {},
      create: { name, createdBy: creatorId },
    });
    for (const memberName of memberNames) {
      const clientId = clientIdByName.get(memberName)!;
      await prisma.groupMember.upsert({
        where: { groupId_clientId: { groupId: group.id, clientId } },
        update: {},
        create: { groupId: group.id, clientId },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
