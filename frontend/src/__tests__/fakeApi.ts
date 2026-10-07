import type { ApiClient, ApiGroup, ApiMessage } from "../api/types";

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

type SocketHandler = (payload: unknown) => void;

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

/** Stands in for `ws/socket.ts`'s ChatSocket in tests — same `on`/`send`/`close`
 * shape, but `emit` lets a test push a frame in directly instead of going
 * through a real connection. */
class FakeChatSocket {
  private handlers = new Map<string, Set<SocketHandler>>();

  constructor(_token: string) {
    fakeApi.__registerSocket(this);
  }

  on(type: string, handler: SocketHandler): () => void {
    const set = this.handlers.get(type) ?? new Set<SocketHandler>();
    set.add(handler);
    this.handlers.set(type, set);
    return () => set.delete(handler);
  }

  send(_type: string, _data: Record<string, unknown>) {}

  close() {
    fakeApi.__unregisterSocket(this);
  }

  emit(type: string, payload: unknown) {
    const set = this.handlers.get(type);
    if (!set) return;
    for (const handler of set) handler(payload);
  }
}

/** In-memory stand-in for the real HTTP + WebSocket API (backend/API.md), used
 * by tests via `vi.mock("../api", ...)` / `vi.mock("../ws/socket", ...)` so
 * component tests exercise the same async/push shape the real app has,
 * without a server. */
function createFakeApi() {
  let clients: ApiClient[] = defaultClients();
  let groups: ApiGroup[] = defaultGroups();
  let messagesByRoom: Record<string, ApiMessage[]> = {};
  let unreadByClient: Record<string, Record<string, number>> = {};
  let passwordByClientId: Record<string, string> = {};
  let currentClientId: string | null = null;
  let currentClientName = "";
  let token: string | null = null;
  let sockets: FakeChatSocket[] = [];

  function requireAuth(): string {
    if (!currentClientId) {
      throw new FakeApiError(401, "UNAUTHORIZED", "Missing or invalid token.");
    }
    return currentClientId;
  }

  return {
    async register(name: string, password: string): Promise<ApiClient> {
      const trimmed = name.trim();
      if (!trimmed) throw new FakeApiError(400, "EMPTY_NAME", "Enter a name.");
      if (trimmed.length > 24) {
        throw new FakeApiError(400, "NAME_TOO_LONG", "Keep your name under 24 characters.");
      }
      if (!password) throw new FakeApiError(400, "EMPTY_PASSWORD", "Enter a password.");
      if (password.length < 8) {
        throw new FakeApiError(400, "PASSWORD_TOO_SHORT", "Password must be at least 8 characters.");
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
      passwordByClientId[client.id] = password;
      currentClientId = client.id;
      currentClientName = client.name;
      token = uid("t");
      return client;
    },

    async login(name: string, password: string): Promise<ApiClient> {
      const trimmed = name.trim();
      const client = clients.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
      if (!client || passwordByClientId[client.id] !== password) {
        throw new FakeApiError(401, "INVALID_CREDENTIALS", "Incorrect name or password.");
      }
      currentClientId = client.id;
      currentClientName = client.name;
      token = uid("t");
      return client;
    },

    hasToken(): boolean {
      return token !== null;
    },

    getToken(): string | null {
      return token;
    },

    async getMe(): Promise<ApiClient> {
      const selfId = requireAuth();
      const client = clients.find((c) => c.id === selfId);
      if (!client) throw new FakeApiError(404, "CLIENT_NOT_FOUND", "Client not found.");
      return client;
    },

    async logout(): Promise<void> {
      currentClientId = null;
      token = null;
    },

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

    async markRead(roomId: string): Promise<void> {
      const selfId = requireAuth();
      if (unreadByClient[selfId]) delete unreadByClient[selfId][roomId];
    },

    /** Test-only: hand the WS mock a channel back into this fixture. */
    __registerSocket(socket: FakeChatSocket) {
      sockets.push(socket);
    },

    __unregisterSocket(socket: FakeChatSocket) {
      sockets = sockets.filter((s) => s !== socket);
    },

    /** Test-only: simulate another real client posting into a room — pushed
     * the same way the real backend's hub fans a `message`/`unread` frame out
     * over the socket, since there's no auto-reply bot to rely on (see
     * backend/API.md §5). */
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
      for (const socket of sockets) socket.emit("message", message);

      for (const c of clients) {
        if (c.id === opts.senderId) continue;
        unreadByClient[c.id] ??= {};
        const count = (unreadByClient[c.id][roomId] ?? 0) + 1;
        unreadByClient[c.id][roomId] = count;
        for (const socket of sockets) socket.emit("unread", { roomId, count });
      }
    },

    /** Test-only: reset to a fresh fixture between tests. */
    __reset() {
      clients = defaultClients();
      groups = defaultGroups();
      messagesByRoom = {};
      unreadByClient = {};
      passwordByClientId = {};
      currentClientId = null;
      currentClientName = "";
      token = null;
      sockets = [];
    },
  };
}

export const fakeApi = createFakeApi();
export { FakeChatSocket };
