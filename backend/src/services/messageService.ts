import { AppError } from "../lib/errors";
import { parseRoomId } from "../lib/roomId";
import { clientRepository } from "../repositories/clientRepository";
import { groupRepository } from "../repositories/groupRepository";
import { messageRepository } from "../repositories/messageRepository";

const DEFAULT_PAGE_LIMIT = 50;
const MAX_POLL_LIMIT = 200;

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

export const messageService = {
  async list(roomId: string, callerId: string, opts: { before?: number; after?: number }) {
    const ref = await resolveRoom(roomId, callerId);
    const before = opts.before ? new Date(opts.before) : undefined;
    const after = opts.after ? new Date(opts.after) : undefined;
    const limit = after ? MAX_POLL_LIMIT : DEFAULT_PAGE_LIMIT;

    const rows =
      ref.kind === "group"
        ? await messageRepository.listGroupMessages(ref.groupId, { before, after, limit })
        : await messageRepository.listPrivateMessages(callerId, ref.otherClientId, {
            before,
            after,
            limit,
          });

    const ordered = after ? rows : [...rows].reverse();
    const hasMore = !after && rows.length === limit;
    return { messages: ordered.map((m) => toDto(m, roomId)), hasMore };
  },

  async send(roomId: string, callerId: string, rawText: string) {
    const text = rawText.trim();
    if (!text) throw new AppError(400, "EMPTY_TEXT", "Message can't be empty.");
    const ref = await resolveRoom(roomId, callerId);
    const row =
      ref.kind === "group"
        ? await messageRepository.createGroupMessage(ref.groupId, callerId, text)
        : await messageRepository.createPrivateMessage(callerId, ref.otherClientId, text);
    return toDto(row, roomId);
  },
};
