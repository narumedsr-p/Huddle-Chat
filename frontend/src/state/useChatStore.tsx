import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type { ReactNode } from "react";
import { api, ApiError, getToken, hasToken } from "../api";
import type { ApiMessage } from "../api";
import { CHATBOT_CLIENT, CHATBOT_CLIENT_ID } from "../lib/chatbot";
import type { Client, Group, Message, Room, RoomKind } from "../types";
import { ChatSocket } from "../ws/socket";

export const PRIVATE_PREFIX = "private:";
export const GROUP_PREFIX = "group:";

export function privateRoomId(clientId: string) {
  return `${PRIVATE_PREFIX}${clientId}`;
}

export function groupRoomId(groupId: string) {
  return `${GROUP_PREFIX}${groupId}`;
}

// No TTL on the wire anymore — a stuck "typing…" just means the peer's last
// frame was "true" and nothing ever told us otherwise, so the client has to
// age it out itself instead of trusting the sender to always say "false".
const TYPING_EXPIRY_MS = 4_000;

interface State {
  /** True until we've checked whether a stored session token is still valid. */
  authLoading: boolean;
  currentUser: Client | null;
  clients: Client[];
  groups: Group[];
  openRoomIds: string[];
  activeRoomId: string | null;
  messagesByRoom: Record<string, Message[]>;
  typingRoomIds: Record<string, boolean>;
  unreadCounts: Record<string, number>;
  /** Unread count captured the moment a room was opened, for the "Unread messages" divider. */
  unreadDividers: Record<string, number>;
}

type Action =
  | { type: "JOIN"; client: Client }
  | { type: "AUTH_CHECKED" }
  | { type: "SET_CLIENTS"; clients: Client[] }
  | { type: "PATCH_CLIENT"; clientId: string; online: boolean }
  | { type: "UPSERT_CLIENT"; client: Client }
  | { type: "SET_GROUPS"; groups: Group[] }
  | { type: "UPSERT_GROUP"; group: Group }
  | { type: "REMOVE_GROUP"; groupId: string }
  | { type: "LEAVE_GROUP_LOCAL"; groupId: string; clientId: string }
  | { type: "OPEN_ROOM"; roomId: string }
  | { type: "CLOSE_ROOM"; roomId: string }
  | { type: "SET_ACTIVE"; roomId: string }
  | { type: "MERGE_MESSAGES"; roomId: string; messages: Message[] }
  | { type: "REMOVE_MESSAGE"; roomId: string; id: string }
  | { type: "SET_TYPING"; roomId: string; typing: boolean }
  | { type: "SET_UNREAD"; unreadCounts: Record<string, number> }
  | { type: "PATCH_UNREAD"; roomId: string; count: number }
  | { type: "RESET" };

const initialState: State = {
  authLoading: true,
  currentUser: null,
  clients: [],
  groups: [],
  openRoomIds: [],
  activeRoomId: null,
  messagesByRoom: {},
  typingRoomIds: {},
  unreadCounts: {},
  unreadDividers: {},
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
      return {
        ...state,
        authLoading: false,
        currentUser: action.client,
        clients: [action.client],
      };
    case "AUTH_CHECKED":
      return { ...state, authLoading: false };
    case "SET_CLIENTS":
      return { ...state, clients: action.clients };
    case "PATCH_CLIENT":
      return {
        ...state,
        clients: state.clients.map((c) =>
          c.id === action.clientId ? { ...c, online: action.online } : c,
        ),
      };
    case "UPSERT_CLIENT": {
      const exists = state.clients.some((c) => c.id === action.client.id);
      return {
        ...state,
        clients: exists
          ? state.clients.map((c) => (c.id === action.client.id ? action.client : c))
          : [...state.clients, action.client],
      };
    }
    case "SET_GROUPS":
      return { ...state, groups: action.groups };
    case "UPSERT_GROUP":
      return { ...state, groups: upsertGroup(state.groups, action.group) };
    case "REMOVE_GROUP":
      return { ...state, groups: state.groups.filter((g) => g.id !== action.groupId) };
    case "LEAVE_GROUP_LOCAL":
      return {
        ...state,
        groups: state.groups
          .map((g) =>
            g.id === action.groupId
              ? { ...g, memberIds: g.memberIds.filter((id) => id !== action.clientId) }
              : g,
          )
          .filter((g) => g.memberIds.length > 0),
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
        unreadDividers: {
          ...state.unreadDividers,
          [action.roomId]: state.unreadCounts[action.roomId] ?? 0,
        },
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
    case "PATCH_UNREAD":
      return {
        ...state,
        unreadCounts: { ...state.unreadCounts, [action.roomId]: action.count },
      };
    case "RESET":
      return { ...initialState, authLoading: false };
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
    if (clientId === CHATBOT_CLIENT_ID) {
      return { kind: "private", name: CHATBOT_CLIENT.name, refId: CHATBOT_CLIENT_ID };
    }
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
  register: (name: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  login: (name: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
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
  const socketRef = useRef<ChatSocket | null>(null);
  const activeRoomIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeRoomIdRef.current = state.activeRoomId;
  }, [state.activeRoomId]);

  const register = useCallback(
    async (name: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      try {
        const client = await api.register(name, password);
        dispatch({ type: "JOIN", client: { ...client, isSelf: true } });
        return { ok: true };
      } catch (err) {
        return { ok: false, error: errorMessage(err) };
      }
    },
    [],
  );

  const login = useCallback(
    async (name: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      try {
        const client = await api.login(name, password);
        dispatch({ type: "JOIN", client: { ...client, isSelf: true } });
        return { ok: true };
      } catch (err) {
        return { ok: false, error: errorMessage(err) };
      }
    },
    [],
  );

  // Restore a logged-in session on page load if a token is already stored.
  useEffect(() => {
    if (!hasToken()) {
      dispatch({ type: "AUTH_CHECKED" });
      return;
    }
    api
      .getMe()
      .then((client) => dispatch({ type: "JOIN", client: { ...client, isSelf: true } }))
      .catch(() => {
        api.logout().catch(() => {});
        dispatch({ type: "AUTH_CHECKED" });
      });
  }, []);

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
          // The server also echoes this same message back over the socket
          // (so other tabs pick it up) — merging is idempotent on id, so
          // whichever of the two arrives second is just a no-op.
          dispatch({ type: "MERGE_MESSAGES", roomId, messages: [toMessage(message, selfId)] });
        })
        .catch(() => {
          dispatch({ type: "REMOVE_MESSAGE", roomId, id: tempId });
        });
    },
    [state.currentUser],
  );

  const setTyping = useCallback((roomId: string, typing: boolean) => {
    // Best-effort, unacknowledged — same tradeoff UDP makes for things where
    // a dropped update isn't worth the cost of a retransmit.
    socketRef.current?.send("typing", { roomId, typing });
  }, []);

  // One socket per login, carrying every push the old poll loops used to
  // fetch separately: presence, roster/group deltas, unread deltas, new
  // messages, and typing. REST still owns one-shot reads and every mutation
  // (register/login, send, join/leave, mark-read) — this connection is
  // receive-mostly, the server pushing state the client didn't ask for yet.
  useEffect(() => {
    const userId = state.currentUser?.id;
    const token = getToken();
    if (!userId || !token) return;
    const clientId: string = userId;

    let cancelled = false;
    const typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

    // Run on mount and again after every reconnect — a dropped connection
    // has no sequence numbers to resume from, so the only sound way to
    // catch up on whatever happened during the gap is to re-pull a fresh
    // snapshot instead of trusting the stream picked up where it left off.
    const syncSnapshot = () => {
      api
        .listClients()
        .then((clients) => {
          if (!cancelled) {
            dispatch({
              type: "SET_CLIENTS",
              clients: clients.map((c) => ({ ...c, isSelf: c.id === clientId })),
            });
          }
        })
        .catch(() => {});
      api.listGroups().then((groups) => {
        if (!cancelled) dispatch({ type: "SET_GROUPS", groups });
      }).catch(() => {});
      api.getUnreadCounts().then((unreadCounts) => {
        if (!cancelled) dispatch({ type: "SET_UNREAD", unreadCounts });
      }).catch(() => {});
      if (activeRoomIdRef.current) {
        const roomId = activeRoomIdRef.current;
        api.getMessages(roomId).then(({ messages }) => {
          if (cancelled) return;
          dispatch({
            type: "MERGE_MESSAGES",
            roomId,
            messages: messages.map((m) => toMessage(m, clientId)),
          });
        }).catch(() => {});
      }
    };
    syncSnapshot();

    const socket = new ChatSocket(token);
    socketRef.current = socket;

    const unsubscribers = [
      socket.on("open", syncSnapshot),
      socket.on("client", (payload) => {
        dispatch({ type: "UPSERT_CLIENT", client: payload as Client });
      }),
      socket.on("presence", (payload) => {
        const { clientId: id, online } = payload as { clientId: string; online: boolean };
        dispatch({ type: "PATCH_CLIENT", clientId: id, online });
      }),
      socket.on("group", (payload) => {
        dispatch({ type: "UPSERT_GROUP", group: payload as Group });
      }),
      socket.on("groupDeleted", (payload) => {
        const { groupId } = payload as { groupId: string };
        dispatch({ type: "REMOVE_GROUP", groupId });
      }),
      socket.on("message", (payload) => {
        const message = payload as ApiMessage;
        dispatch({
          type: "MERGE_MESSAGES",
          roomId: message.roomId,
          messages: [toMessage(message, clientId)],
        });
      }),
      socket.on("unread", (payload) => {
        const { roomId, count } = payload as { roomId: string; count: number };
        if (roomId === activeRoomIdRef.current) {
          api.markRead(roomId).catch(() => {});
          return;
        }
        dispatch({ type: "PATCH_UNREAD", roomId, count });
      }),
      socket.on("typing", (payload) => {
        const { roomId, typing } = payload as { roomId: string; typing: boolean };
        dispatch({ type: "SET_TYPING", roomId, typing });

        const pending = typingTimeouts.get(roomId);
        if (pending) clearTimeout(pending);
        if (typing) {
          typingTimeouts.set(
            roomId,
            setTimeout(() => dispatch({ type: "SET_TYPING", roomId, typing: false }), TYPING_EXPIRY_MS),
          );
        } else {
          typingTimeouts.delete(roomId);
        }
      }),
    ];

    return () => {
      cancelled = true;
      for (const unsubscribe of unsubscribers) unsubscribe();
      for (const timeout of typingTimeouts.values()) clearTimeout(timeout);
      socket.close();
      socketRef.current = null;
    };
  }, [state.currentUser?.id]);

  // One-shot history fetch for whatever room just became active — new
  // messages after this point arrive over the socket above, no re-fetch loop.
  useEffect(() => {
    const userId = state.currentUser?.id;
    const activeRoomId = state.activeRoomId;
    if (!userId || !activeRoomId) return;

    let cancelled = false;
    api
      .getMessages(activeRoomId)
      .then(({ messages }) => {
        if (cancelled) return;
        dispatch({
          type: "MERGE_MESSAGES",
          roomId: activeRoomId,
          messages: messages.map((m) => toMessage(m, userId)),
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
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
    register,
    login,
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
