import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { groupRoomKey, privateRoomKey } from "../src/lib/roomId";

const prisma = new PrismaClient();

// Every seeded client logs in with this password.
const DEV_PASSWORD = "Password123!";

const FEATURED: { name: string; online: boolean }[] = [
  { name: "Chatbot", online: true },
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

function minutesAgo(n: number) {
  return new Date(Date.now() - n * 60_000);
}

async function createMessage(data: {
  senderId: string;
  text: string;
  timestamp: Date;
  groupId?: string;
  recipientId?: string;
}) {
  await prisma.message.create({ data });
}

async function markRead(clientId: string, roomKey: string, lastReadAt: Date) {
  await prisma.readState.upsert({
    where: { clientId_roomKey: { clientId, roomKey } },
    update: { lastReadAt },
    create: { clientId, roomKey, lastReadAt },
  });
}

async function main() {
  const clientIdByName = new Map<string, string>();
  const passwordHash = await hashPassword(DEV_PASSWORD);

  for (const { name, online } of FEATURED) {
    const client = await prisma.client.upsert({
      where: { name },
      update: { online, passwordHash },
      create: { id: name === "Chatbot" ? "chatbot" : undefined, name, online, passwordHash },
    });
    clientIdByName.set(name, client.id);
  }

  const groupIdByName = new Map<string, string>();
  for (const { name, createdBy, memberNames } of GROUPS) {
    const creatorId = clientIdByName.get(createdBy)!;
    const group = await prisma.group.upsert({
      where: { name },
      update: {},
      create: { name, createdBy: creatorId },
    });
    groupIdByName.set(name, group.id);
    for (const memberName of memberNames) {
      const clientId = clientIdByName.get(memberName)!;
      await prisma.groupMember.upsert({
        where: { groupId_clientId: { groupId: group.id, clientId } },
        update: {},
        create: { groupId: group.id, clientId },
      });
    }
  }

  // --- Unread message mock data, all from Nara's point of view ---
  const naraId = clientIdByName.get("Nara")!;
  const ployId = clientIdByName.get("Ploy")!;
  const tarId = clientIdByName.get("Tar")!;
  const jungleDevsId = groupIdByName.get("Jungle Devs")!;
  const monkeyBusinessId = groupIdByName.get("Monkey Business")!;

  // Clear out any messages from a previous seed run so re-seeding doesn't
  // keep stacking more "unread" messages on top of the last run's.
  await prisma.message.deleteMany({
    where: {
      OR: [
        { groupId: { in: [jungleDevsId, monkeyBusinessId] } },
        { senderId: tarId, recipientId: naraId },
      ],
    },
  });

  // Jungle Devs: Tar floods the group so Nara ends up with 120 unread —
  // enough to exercise the "99+" badge cap.
  for (let i = 10; i >= 1; i--) {
    await createMessage({
      groupId: jungleDevsId,
      senderId: tarId,
      text: `Early sync #${11 - i}`,
      timestamp: minutesAgo(130 + i),
    });
  }
  await markRead(naraId, groupRoomKey(jungleDevsId), minutesAgo(125));
  for (let i = 120; i >= 1; i--) {
    await createMessage({
      groupId: jungleDevsId,
      senderId: tarId,
      text: `Deploy log line ${121 - i}`,
      timestamp: minutesAgo(i),
    });
  }

  // Monkey Business: Ploy sends a moderate unread batch for Nara —
  // exercises the plain "N unread messages" divider.
  for (let i = 5; i >= 1; i--) {
    await createMessage({
      groupId: monkeyBusinessId,
      senderId: ployId,
      text: `Banana count update ${6 - i}`,
      timestamp: minutesAgo(60 + i),
    });
  }
  await markRead(naraId, groupRoomKey(monkeyBusinessId), minutesAgo(55));
  for (let i = 8; i >= 1; i--) {
    await createMessage({
      groupId: monkeyBusinessId,
      senderId: ployId,
      text: `Who's up for lunch? (${9 - i})`,
      timestamp: minutesAgo(i),
    });
  }

  // Private DM: Tar -> Nara, a handful of unread messages.
  for (let i = 2; i >= 1; i--) {
    await createMessage({
      senderId: tarId,
      recipientId: naraId,
      text: `Hey, saw the deploy logs? (${3 - i})`,
      timestamp: minutesAgo(20 + i),
    });
  }
  await markRead(naraId, privateRoomKey(tarId), minutesAgo(15));
  for (let i = 3; i >= 1; i--) {
    await createMessage({
      senderId: tarId,
      recipientId: naraId,
      text: `Ping ${4 - i} — you free?`,
      timestamp: minutesAgo(i),
    });
  }

  console.log(`Seed complete. Log in as any featured name with password "${DEV_PASSWORD}".`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
