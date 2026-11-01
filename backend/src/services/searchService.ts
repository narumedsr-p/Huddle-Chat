import { AppError } from "../lib/errors";
import { parseRoomId } from "../lib/roomId";
import { clientRepository } from "../repositories/clientRepository";
import { groupRepository } from "../repositories/groupRepository";
import { messageRepository } from "../repositories/messageRepository";
import { searchMessages } from "../lib/ai";
import type { SearchMessage } from "../lib/ai";

const MAX_SEARCH_FETCH = 200;

interface MessageRow {
  id: string;
  senderId: string;
  sender: { name: string };
  text: string;
  timestamp: Date;
}

function toDto(message: MessageRow, roomId: string) {
  return {
    id: message.id,
    roomId,
    senderId: message.senderId,
    senderName: message.sender.name,
    text: message.text,
    timestamp: message.timestamp.getTime(),
  };
}

async function resolveRoom(roomId: string, callerId: string) {
  const ref = parseRoomId(roomId);
  if (ref.kind === "group") {
    const isMember = await groupRepository.isMember(ref.groupId, callerId);
    if (!isMember) {
      throw new AppError(403, "NOT_A_PARTICIPANT", "You're not a member of this group.");
    }
    return ref;
  }
  const other = await clientRepository.findById(ref.otherClientId);
  if (!other) throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found.");
  return ref;
}

export const searchService = {
  async searchRoom(roomId: string, callerId: string, rawQuery: string) {
    const query = rawQuery.trim();
    if (!query) {
      return { matches: [] };
    }

    const ref = await resolveRoom(roomId, callerId);

    const rows =
      ref.kind === "group"
        ? await messageRepository.listGroupMessages(ref.groupId, { limit: MAX_SEARCH_FETCH })
        : await messageRepository.listPrivateMessages(callerId, ref.otherClientId, {
            limit: MAX_SEARCH_FETCH,
          });

    if (rows.length === 0) {
      return { matches: [] };
    }

    // messageRepository returns newest first (desc); reverse so search sees oldest to newest chronological lines
    const ordered = [...rows].reverse();

    const searchInput: SearchMessage[] = ordered.map((m) => ({
      id: m.id,
      name: m.sender.name,
      content: m.text,
      timestamp: m.timestamp,
    }));

    const matchedIds = await searchMessages(query, searchInput);

    const messageMap = new Map(ordered.map((m) => [m.id, m]));
    const matches = matchedIds
      .map((id) => messageMap.get(id))
      .filter((m): m is NonNullable<typeof m> => m !== undefined)
      .map((m) => toDto(m, roomId));

    return { matches };
  },
};
