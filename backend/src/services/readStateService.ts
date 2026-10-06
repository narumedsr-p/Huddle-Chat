import { groupRoomKey, privateRoomKey } from "../lib/roomId";
import { groupRepository } from "../repositories/groupRepository";
import { messageRepository } from "../repositories/messageRepository";
import { readStateRepository } from "../repositories/readStateRepository";

const EPOCH = new Date(0);

export const readStateService = {
  async markRead(roomId: string, clientId: string) {
    await readStateRepository.upsert(clientId, roomId, new Date());
  },

  async unreadCounts(clientId: string) {
    const result: Record<string, number> = {};

    const groups = await groupRepository.findAllWithMembers();
    const myGroups = groups.filter((g) => g.members.some((m) => m.clientId === clientId));
    for (const group of myGroups) {
      const roomKey = groupRoomKey(group.id);
      const readState = await readStateRepository.find(clientId, roomKey);
      const lastReadAt = readState?.lastReadAt ?? EPOCH;
      const count = await messageRepository.countUnreadForGroup(group.id, clientId, lastReadAt);
      if (count > 0) result[roomKey] = count;
    }

    const counterpartIds = await messageRepository.distinctPrivateCounterparts(clientId);
    for (const otherId of counterpartIds) {
      const roomKey = privateRoomKey(otherId);
      const readState = await readStateRepository.find(clientId, roomKey);
      const lastReadAt = readState?.lastReadAt ?? EPOCH;
      const count = await messageRepository.countUnreadForPrivate(clientId, otherId, lastReadAt);
      if (count > 0) result[roomKey] = count;
    }

    return result;
  },
};
