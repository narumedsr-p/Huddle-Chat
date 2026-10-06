import type { ApiClient, ApiGroup, ApiMessage, ApiTyper } from "../api/types";

export class FakeApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface InjectOptions {
  senderId: string;
  senderName: string;
  text: string;
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultClients(): ApiClient[] {
  return [
    { id: "c-nara", name: "Nara", online: true },
    { id: "c-ploy", name: "Ploy", online: true },
  ];
}

function defaultGroups(): ApiGroup[] {
  return [
    {
      id: "g-monkey-business",
      name: "Monkey Business",
      createdBy: "c-nara",
      memberIds: ["c-nara"],
    },
  ];
}

/** In-memory stand-in for the real HTTP API (backend/API.md), used by tests via
 * `vi.mock("../api", ...)` so component tests exercise the same async/promise
 * shape the real api/ module has, without a server. */
function createFakeApi() {
  let clients: ApiClient[] = defaultClients();
  let groups: ApiGroup[] = defaultGroups();
  let messagesByRoom: Record<string, ApiMessage[]> = {};
  let unreadByClient: Record<string, Record<string, number>> = {};
  let currentClientId: string | null = null;
  let currentClientName = "";

  function requireAuth(): string {
    if (!currentClientId) {
      throw new FakeApiError(401, "UNAUTHORIZED", "Missing or invalid token.");
    }
    return currentClientId;
  }

  return {
    async join(name: string): Promise<ApiClient> {
      const trimmed = name.trim();
      if (!trimmed) throw new FakeApiError(400, "EMPTY_NAME", "Enter a name to join the chat.");
      if (trimmed.length > 24) {
        throw new FakeApiError(400, "NAME_TOO_LONG", "Keep your name under 24 characters.");
      }
      if (clients.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new FakeApiError(
          409,
          "NAME_TAKEN",
          `"${trimmed}" is already taken. Try another name.`,
        );
      }
      const client: ApiClient = { id: uid("c"), name: trimmed, online: true };
      clients = [...clients, client];
      currentClientId = client.id;
      currentClientName = client.name;
      return client;
    },

    async logout(): Promise<void> {
      currentClientId = null;
    },

    async heartbeat(): Promise<void> {},

    async listClients(): Promise<ApiClient[]> {
      requireAuth();
      return clients;
    },

    async getUnreadCounts(): Promise<Record<string, number>> {
      const selfId = requireAuth();
      return { ...(unreadByClient[selfId] ?? {}) };
    },

    async listGroups(): Promise<ApiGroup[]> {
      requireAuth();
      return groups;
    },

    async createGroup(name: string): Promise<ApiGroup> {
      const selfId = requireAuth();
      const trimmed = name.trim();
      if (!trimmed) throw new FakeApiError(400, "EMPTY_NAME", "Give your group a name.");
      if (groups.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new FakeApiError(
          409,
          "GROUP_NAME_TAKEN",
          `A group named "${trimmed}" already exists.`,
        );
      }
      const group: ApiGroup = { id: uid("g"), name: trimmed, createdBy: selfId, memberIds: [selfId] };
      groups = [...groups, group];
      return group;
    },

    async joinGroup(groupId: string): Promise<ApiGroup> {
      const selfId = requireAuth();
      const group = groups.find((g) => g.id === groupId);
      if (!group) throw new FakeApiError(404, "GROUP_NOT_FOUND", "Group not found.");
      if (group.memberIds.includes(selfId)) {
        throw new FakeApiError(409, "ALREADY_MEMBER", "You're already a member of this group.");
      }
      const updated: ApiGroup = { ...group, memberIds: [...group.memberIds, selfId] };
      groups = groups.map((g) => (g.id === groupId ? updated : g));
      return updated;
    },

    async leaveGroup(groupId: string): Promise<void> {
      const selfId = requireAuth();
      groups = groups.map((g) =>
        g.id === groupId ? { ...g, memberIds: g.memberIds.filter((id) => id !== selfId) } : g,
      );
    },

    async getMessages(
      roomId: string,
      opts: { before?: number; after?: number } = {},
    ): Promise<{ messages: ApiMessage[]; hasMore: boolean }> {
      requireAuth();
      const all = messagesByRoom[roomId] ?? [];
      let filtered = all;
      if (opts.after !== undefined) {
        filtered = all.filter((m) => m.timestamp > opts.after!);
      } else if (opts.before !== undefined) {
        filtered = all.filter((m) => m.timestamp < opts.before!);
      }
      return { messages: filtered, hasMore: false };
    },

    async sendMessage(roomId: string, text: string): Promise<ApiMessage> {
      const selfId = requireAuth();
      const message: ApiMessage = {
        id: uid("m"),
        roomId,
        senderId: selfId,
        senderName: currentClientName,
        text,
        timestamp: Date.now(),
      };
      messagesByRoom[roomId] = [...(messagesByRoom[roomId] ?? []), message];
      return message;
    },

    async getTyping(_roomId: string): Promise<ApiTyper[]> {
      requireAuth();
      return [];
    },

    async setTyping(): Promise<void> {},

    async markRead(roomId: string): Promise<void> {
      const selfId = requireAuth();
      if (unreadByClient[selfId]) delete unreadByClient[selfId][roomId];
    },

    /** Test-only: simulate another real client posting into a room, since the
     * real app has no auto-reply bot to rely on (see backend/API.md §5). */
    __injectMessage(roomId: string, opts: InjectOptions) {
      const message: ApiMessage = {
        id: uid("m"),
        roomId,
        senderId: opts.senderId,
        senderName: opts.senderName,
        text: opts.text,
        timestamp: Date.now(),
      };
      messagesByRoom[roomId] = [...(messagesByRoom[roomId] ?? []), message];
      for (const c of clients) {
        if (c.id === opts.senderId) continue;
        unreadByClient[c.id] ??= {};
        unreadByClient[c.id][roomId] = (unreadByClient[c.id][roomId] ?? 0) + 1;
      }
    },

    /** Test-only: reset to a fresh fixture between tests. */
    __reset() {
      clients = defaultClients();
      groups = defaultGroups();
      messagesByRoom = {};
      unreadByClient = {};
      currentClientId = null;
      currentClientName = "";
    },
  };
}

export const fakeApi = createFakeApi();
