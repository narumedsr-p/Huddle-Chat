import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import type { ReactNode } from "react";
import { api, ApiError } from "../api";
import type { ApiMessage } from "../api";
import type { Client, Group, Message, Room, RoomKind } from "../types";

export const PRIVATE_PREFIX = "private:";
export const GROUP_PREFIX = "group:";

export function privateRoomId(clientId: string) {
  return `${PRIVATE_PREFIX}${clientId}`;
}

export function groupRoomId(groupId: string) {
  return `${GROUP_PREFIX}${groupId}`;
}

const HEARTBEAT_INTERVAL_MS = 20_000;
const CLIENTS_POLL_INTERVAL_MS = 12_000;
const GROUPS_POLL_INTERVAL_MS = 20_000;
const UNREAD_POLL_INTERVAL_MS = 10_000;
const ROOM_POLL_INTERVAL_MS = 2_500;

interface State {
  currentUser: Client | null;
  clients: Client[];
  groups: Group[];
  openRoomIds: string[];
  activeRoomId: string | null;
  messagesByRoom: Record<string, Message[]>;
  typingRoomIds: Record<string, boolean>;
  unreadCounts: Record<string, number>;
}

type Action =
  | { type: "JOIN"; client: Client }
  | { type: "SET_CLIENTS"; clients: Client[] }
  | { type: "SET_GROUPS"; groups: Group[] }
  | { type: "UPSERT_GROUP"; group: Group }
  | { type: "LEAVE_GROUP_LOCAL"; groupId: string; clientId: string }
  | { type: "OPEN_ROOM"; roomId: string }
  | { type: "CLOSE_ROOM"; roomId: string }
  | { type: "SET_ACTIVE"; roomId: string }
  | { type: "MERGE_MESSAGES"; roomId: string; messages: Message[] }
  | { type: "REMOVE_MESSAGE"; roomId: string; id: string }
  | { type: "SET_TYPING"; roomId: string; typing: boolean }
  | { type: "SET_UNREAD"; unreadCounts: Record<string, number> }
  | { type: "RESET" };

const initialState: State = {
  currentUser: null,
  clients: [],
  groups: [],
  openRoomIds: [],
  activeRoomId: null,
  messagesByRoom: {},
  typingRoomIds: {},
  unreadCounts: {},
};

function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  if (incoming.length === 0) return existing;
  const byId = new Map(existing.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return Array.from(byId.values()).sort((a, b) => a.timestamp - b.timestamp);
}

function upsertGroup(groups: Group[], group: Group): Group[] {
  const idx = groups.findIndex((g) => g.id === group.id);
  if (idx === -1) return [...groups, group];
  const next = [...groups];
  next[idx] = group;
  return next;
}

function toMessage(m: ApiMessage, selfId: string): Message {
  return { ...m, isSelf: m.senderId === selfId };
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Something went wrong. Please try again.";
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "JOIN":
      return { ...state, currentUser: action.client, clients: [action.client] };
    case "SET_CLIENTS":
      return { ...state, clients: action.clients };
    case "SET_GROUPS":
      return { ...state, groups: action.groups };
    case "UPSERT_GROUP":
      return { ...state, groups: upsertGroup(state.groups, action.group) };
    case "LEAVE_GROUP_LOCAL":
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId
            ? { ...g, memberIds: g.memberIds.filter((id) => id !== action.clientId) }
            : g,
        ),
      };
    case "OPEN_ROOM":
      return state.openRoomIds.includes(action.roomId)
        ? state
        : { ...state, openRoomIds: [...state.openRoomIds, action.roomId] };
    case "CLOSE_ROOM": {
      const openRoomIds = state.openRoomIds.filter((id) => id !== action.roomId);
      const activeRoomId =
        state.activeRoomId === action.roomId
          ? (openRoomIds[openRoomIds.length - 1] ?? null)
          : state.activeRoomId;
      return { ...state, openRoomIds, activeRoomId };
    }
    case "SET_ACTIVE":
      return {
        ...state,
        activeRoomId: action.roomId,
        unreadCounts: { ...state.unreadCounts, [action.roomId]: 0 },
      };
    case "MERGE_MESSAGES":
      return {
        ...state,
        messagesByRoom: {
          ...state.messagesByRoom,
          [action.roomId]: mergeMessages(
            state.messagesByRoom[action.roomId] ?? [],
            action.messages,
          ),
        },
      };
    case "REMOVE_MESSAGE":
      return {
        ...state,
        messagesByRoom: {
          ...state.messagesByRoom,
          [action.roomId]: (state.messagesByRoom[action.roomId] ?? []).filter(
            (m) => m.id !== action.id,
          ),
        },
      };
    case "SET_TYPING":
      return {
        ...state,
        typingRoomIds: { ...state.typingRoomIds, [action.roomId]: action.typing },
      };
    case "SET_UNREAD":
      return { ...state, unreadCounts: action.unreadCounts };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function roomMeta(
  roomId: string,
  clients: Client[],
  groups: Group[],
): { kind: RoomKind; name: string; refId: string; group?: Group } | null {
  if (roomId.startsWith(PRIVATE_PREFIX)) {
    const clientId = roomId.slice(PRIVATE_PREFIX.length);
    const client = clients.find((c) => c.id === clientId);
    return client
      ? { kind: "private", name: client.name, refId: clientId }
      : null;
  }
  if (roomId.startsWith(GROUP_PREFIX)) {
    const groupId = roomId.slice(GROUP_PREFIX.length);
    const group = groups.find((g) => g.id === groupId);
    return group
      ? { kind: "group", name: group.name, refId: groupId, group }
      : null;
  }
  return null;
}

interface ChatStoreValue extends State {
  rooms: Room[];
  join: (name: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
  createGroup: (name: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
  openPrivateRoom: (clientId: string) => void;
  openGroupRoom: (groupId: string) => void;
  closeRoom: (roomId: string) => void;
  setActiveRoom: (roomId: string) => void;
  sendMessage: (roomId: string, text: string) => void;
  setTyping: (roomId: string, typing: boolean) => void;
}

const ChatStoreContext = createContext<ChatStoreValue | null>(null);

export function ChatStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const join = useCallback(
    async (name: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      try {
        const client = await api.join(name);
        dispatch({ type: "JOIN", client: { ...client, isSelf: true } });
        return { ok: true };
      } catch (err) {
        return { ok: false, error: errorMessage(err) };
      }
    },
    [],
  );

  const logout = useCallback(() => {
    api.logout().catch(() => {});
    dispatch({ type: "RESET" });
  }, []);

  const createGroup = useCallback(
    async (name: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      try {
        const group = await api.createGroup(name);
        dispatch({ type: "UPSERT_GROUP", group });
        const roomId = groupRoomId(group.id);
        dispatch({ type: "OPEN_ROOM", roomId });
        dispatch({ type: "SET_ACTIVE", roomId });
        api.markRead(roomId).catch(() => {});
        return { ok: true };
      } catch (err) {
        return { ok: false, error: errorMessage(err) };
      }
    },
    [],
  );

  const joinGroup = useCallback((groupId: string) => {
    api
      .joinGroup(groupId)
      .then((group) => dispatch({ type: "UPSERT_GROUP", group }))
      .catch(() => {});
  }, []);

  const leaveGroup = useCallback(
    (groupId: string) => {
      const clientId = state.currentUser?.id;
      if (!clientId) return;
      dispatch({ type: "LEAVE_GROUP_LOCAL", groupId, clientId });
      dispatch({ type: "CLOSE_ROOM", roomId: groupRoomId(groupId) });
      api.leaveGroup(groupId).catch(() => {});
    },
    [state.currentUser],
  );

  const openPrivateRoom = useCallback((clientId: string) => {
    const roomId = privateRoomId(clientId);
    dispatch({ type: "OPEN_ROOM", roomId });
    dispatch({ type: "SET_ACTIVE", roomId });
    api.markRead(roomId).catch(() => {});
  }, []);

  const openGroupRoom = useCallback((groupId: string) => {
    const roomId = groupRoomId(groupId);
    dispatch({ type: "OPEN_ROOM", roomId });
    dispatch({ type: "SET_ACTIVE", roomId });
    api.markRead(roomId).catch(() => {});
  }, []);

  const closeRoom = useCallback((roomId: string) => {
    dispatch({ type: "CLOSE_ROOM", roomId });
  }, []);

  const setActiveRoom = useCallback((roomId: string) => {
    dispatch({ type: "SET_ACTIVE", roomId });
    api.markRead(roomId).catch(() => {});
  }, []);

  const sendMessage = useCallback(
    (roomId: string, text: string) => {
      const trimmed = text.trim();
      const selfId = state.currentUser?.id;
      if (!trimmed || !selfId) return;

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const optimistic: Message = {
        id: tempId,
        roomId,
        senderId: selfId,
        senderName: state.currentUser?.name ?? "",
        text: trimmed,
        timestamp: Date.now(),
        isSelf: true,
      };
      dispatch({ type: "MERGE_MESSAGES", roomId, messages: [optimistic] });

      api
        .sendMessage(roomId, trimmed)
        .then((message) => {
          dispatch({ type: "REMOVE_MESSAGE", roomId, id: tempId });
          dispatch({ type: "MERGE_MESSAGES", roomId, messages: [toMessage(message, selfId)] });
        })
        .catch(() => {
          dispatch({ type: "REMOVE_MESSAGE", roomId, id: tempId });
        });
    },
    [state.currentUser],
  );

  const setTyping = useCallback((roomId: string, typing: boolean) => {
    api.setTyping(roomId, typing).catch(() => {});
  }, []);

  // Account-level polling: presence heartbeat, client/group rosters, unread badges.
  useEffect(() => {
    const clientId = state.currentUser?.id;
    if (!clientId) return;

    let cancelled = false;

    api.heartbeat().catch(() => {});
    const heartbeatTimer = setInterval(() => {
      api.heartbeat().catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);

    async function pollClients() {
      try {
        const clients = await api.listClients();
        if (cancelled) return;
        dispatch({
          type: "SET_CLIENTS",
          clients: clients.map((c) => ({ ...c, isSelf: c.id === clientId })),
        });
      } catch {
        // transient poll failure — retry next tick
      }
    }
    pollClients();
    const clientsTimer = setInterval(pollClients, CLIENTS_POLL_INTERVAL_MS);

    async function pollGroups() {
      try {
        const groups = await api.listGroups();
        if (!cancelled) dispatch({ type: "SET_GROUPS", groups });
      } catch {
        // transient poll failure — retry next tick
      }
    }
    pollGroups();
    const groupsTimer = setInterval(pollGroups, GROUPS_POLL_INTERVAL_MS);

    async function pollUnread() {
      try {
        const unreadCounts = await api.getUnreadCounts();
        if (!cancelled) dispatch({ type: "SET_UNREAD", unreadCounts });
      } catch {
        // transient poll failure — retry next tick
      }
    }
    pollUnread();
    const unreadTimer = setInterval(pollUnread, UNREAD_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(heartbeatTimer);
      clearInterval(clientsTimer);
      clearInterval(groupsTimer);
      clearInterval(unreadTimer);
    };
  }, [state.currentUser?.id]);

  // Active-room polling: message history tail + typing indicator.
  useEffect(() => {
    const userId = state.currentUser?.id;
    const activeRoomId = state.activeRoomId;
    if (!userId || !activeRoomId) return;
    const clientId: string = userId;
    const roomId: string = activeRoomId;

    let cancelled = false;
    let lastTimestamp = 0;

    async function loadInitial() {
      try {
        const { messages } = await api.getMessages(roomId);
        if (cancelled) return;
        const mapped = messages.map((m) => toMessage(m, clientId));
        dispatch({ type: "MERGE_MESSAGES", roomId, messages: mapped });
        lastTimestamp = mapped.length ? mapped[mapped.length - 1].timestamp : Date.now() - 1;
      } catch {
        lastTimestamp = Date.now() - 1;
      }
    }

    async function pollRoom() {
      try {
        const [{ messages }, typers] = await Promise.all([
          api.getMessages(roomId, { after: lastTimestamp }),
          api.getTyping(roomId),
        ]);
        if (cancelled) return;
        if (messages.length > 0) {
          const mapped = messages.map((m) => toMessage(m, clientId));
          dispatch({ type: "MERGE_MESSAGES", roomId, messages: mapped });
          lastTimestamp = mapped[mapped.length - 1].timestamp;
        }
        dispatch({ type: "SET_TYPING", roomId, typing: typers.length > 0 });
      } catch {
        // transient poll failure — retry next tick
      }
    }

    loadInitial().then(() => {
      if (!cancelled) pollRoom();
    });
    const timer = setInterval(pollRoom, ROOM_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [state.currentUser?.id, state.activeRoomId]);

  const rooms = useMemo<Room[]>(
    () =>
      state.openRoomIds
        .map((id) => {
          const meta = roomMeta(id, state.clients, state.groups);
          return meta ? { id, kind: meta.kind, refId: meta.refId, name: meta.name } : null;
        })
        .filter((r): r is Room => r !== null),
    [state.openRoomIds, state.clients, state.groups],
  );

  const value: ChatStoreValue = {
    ...state,
    rooms,
    join,
    logout,
    createGroup,
    joinGroup,
    leaveGroup,
    openPrivateRoom,
    openGroupRoom,
    closeRoom,
    setActiveRoom,
    sendMessage,
    setTyping,
  };

  return (
    <ChatStoreContext.Provider value={value}>{children}</ChatStoreContext.Provider>
  );
}

export function useChatStore(): ChatStoreValue {
  const ctx = useContext(ChatStoreContext);
  if (!ctx) throw new Error("useChatStore must be used within ChatStoreProvider");
  return ctx;
}
