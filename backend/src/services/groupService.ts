import { AppError } from "../lib/errors";
import { groupRepository } from "../repositories/groupRepository";

interface GroupWithMembers {
  id: string;
  name: string;
  createdBy: string;
  members: { clientId: string }[];
}

function toDto(group: GroupWithMembers) {
  return {
    id: group.id,
    name: group.name,
    createdBy: group.createdBy,
    memberIds: group.members.map((m) => m.clientId),
  };
}

export const groupService = {
  async list() {
    const groups = await groupRepository.findAllWithMembers();
    return groups.map(toDto);
  },

  async create(rawName: string, creatorId: string) {
    const name = rawName.trim();
    if (!name) throw new AppError(400, "EMPTY_NAME", "Give your group a name.");
    const existing = await groupRepository.findByNameCaseInsensitive(name);
    if (existing) {
      throw new AppError(409, "GROUP_NAME_TAKEN", `A group named "${name}" already exists.`);
    }
    const group = await groupRepository.create(name, creatorId);
    if (!group) throw new AppError(500, "INTERNAL_ERROR", "Failed to create group.");
    return toDto(group);
  },

  async join(groupId: string, clientId: string) {
    const group = await groupRepository.findByIdWithMembers(groupId);
    if (!group) throw new AppError(404, "GROUP_NOT_FOUND", "Group not found.");
    const already = group.members.some((m) => m.clientId === clientId);
    if (already) {
      throw new AppError(409, "ALREADY_MEMBER", "You're already a member of this group.");
    }
    await groupRepository.addMember(groupId, clientId);
    const updated = await groupRepository.findByIdWithMembers(groupId);
    return toDto(updated!);
  },

  async leave(groupId: string, clientId: string) {
    const group = await groupRepository.findByIdWithMembers(groupId);
    if (!group) throw new AppError(404, "GROUP_NOT_FOUND", "Group not found.");
    const isMember = group.members.some((m) => m.clientId === clientId);
    if (!isMember) {
      throw new AppError(409, "NOT_A_MEMBER", "You're not a member of this group.");
    }
    await groupRepository.removeMember(groupId, clientId);
  },
};
