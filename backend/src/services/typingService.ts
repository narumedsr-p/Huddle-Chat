import { AppError } from "../lib/errors";
import { canonicalRoomKey, parseRoomId } from "../lib/roomId";
import { clientRepository } from "../repositories/clientRepository";
import { groupRepository } from "../repositories/groupRepository";
import { typingRepository } from "../repositories/typingRepository";

async function resolveAndAssertParticipant(roomId: string, clientId: string) {
  const ref = parseRoomId(roomId);
  if (ref.kind === "group") {
    const isMember = await groupRepository.isMember(ref.groupId, clientId);
    if (!isMember) {
      throw new AppError(403, "NOT_A_PARTICIPANT", "You're not a member of this group.");
    }
  } else {
    const other = await clientRepository.findById(ref.otherClientId);
    if (!other) throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found.");
  }
  return canonicalRoomKey(ref, clientId);
}

export const typingService = {
  async setTyping(roomId: string, clientId: string, typing: boolean) {
    const roomKey = await resolveAndAssertParticipant(roomId, clientId);
    if (typing) await typingRepository.setTyping(clientId, roomKey);
    else await typingRepository.clearTyping(clientId, roomKey);
  },

  async listTypers(roomId: string, clientId: string) {
    const roomKey = await resolveAndAssertParticipant(roomId, clientId);
    const rows = await typingRepository.listActiveTypers(roomKey, clientId);
    return rows.map((r) => ({ clientId: r.clientId, name: r.client.name }));
  },
};
