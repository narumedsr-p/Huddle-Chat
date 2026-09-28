import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type { ReactNode } from "react";
import { AUTO_REPLY_TYPING_MS, nextAutoReply } from "../mock/autoReply";
import {
  generatePrivateHistory,
  SEED_CLIENTS,
  SEED_GROUPS,
  SEED_MESSAGES,
} from "../mock/seed";
import type { Client, Group, Message, Room, RoomKind } from "../types";

export const PRIVATE_PREFIX = "private:";
export const GROUP_PREFIX = "group:";

export function privateRoomId(clientId: string) {
  return `${PRIVATE_PREFIX}${clientId}`;
}

export function groupRoomId(groupId: string) {
  return `${GROUP_PREFIX}${groupId}`;
}

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
  | { type: "JOIN"; client: Client; privateHistories: Record<string, Message[]> }
  | { type: "CREATE_GROUP"; group: Group }
  | { type: "JOIN_GROUP"; groupId: string; clientId: string }
  | { type: "LEAVE_GROUP"; groupId: string; clientId: string }
  | { type: "OPEN_ROOM"; roomId: string }
  | { type: "CLOSE_ROOM"; roomId: string }
  | { type: "SET_ACTIVE"; roomId: string }
  | { type: "SEND_MESSAGE"; roomId: string; message: Message }
  | { type: "SET_TYPING"; roomId: string; typing: boolean }
  | { type: "RESET" };

function seedMessagesByRoom(): Record<string, Message[]> {
  const out: Record<string, Message[]> = {};
  for (const [roomId, messages] of Object.entries(SEED_MESSAGES)) {
    out[roomId] = messages.map((m) => ({ ...m, roomId }));
  }
  return out;
}

const initialState: State = {
  currentUser: null,
  clients: SEED_CLIENTS,
  groups: SEED_GROUPS,
  openRoomIds: [],
  activeRoomId: null,
  messagesByRoom: seedMessagesByRoom(),
  typingRoomIds: {},
  unreadCounts: {},
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "JOIN":
      return {
        ...state,
        currentUser: action.client,
        clients: [...state.clients, action.client],
        messagesByRoom: { ...state.messagesByRoom, ...action.privateHistories },
      };
    case "CREATE_GROUP":
      return { ...state, groups: [...state.groups, action.group] };
    case "JOIN_GROUP":
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId && !g.memberIds.includes(action.clientId)
            ? { ...g, memberIds: [...g.memberIds, action.clientId] }
            : g,
        ),
      };
    case "LEAVE_GROUP":
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
    case "SEND_MESSAGE": {
      const isUnread = !action.message.isSelf && action.roomId !== state.activeRoomId;
      return {
        ...state,
        messagesByRoom: {
          ...state.messagesByRoom,
          [action.roomId]: [
            ...(state.messagesByRoom[action.roomId] ?? []),
            action.message,
          ],
        },
        unreadCounts: isUnread
          ? {
              ...state.unreadCounts,
              [action.roomId]: (state.unreadCounts[action.roomId] ?? 0) + 1,
            }
          : state.unreadCounts,
      };
    }
    case "SET_TYPING":
      return {
        ...state,
        typingRoomIds: { ...state.typingRoomIds, [action.roomId]: action.typing },
      };
    case "RESET":
      return {
        currentUser: null,
        clients: SEED_CLIENTS,
        groups: SEED_GROUPS,
        openRoomIds: [],
        activeRoomId: null,
        messagesByRoom: seedMessagesByRoom(),
        typingRoomIds: {},
        unreadCounts: {},
      };
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
  join: (name: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  createGroup: (name: string) => { ok: true } | { ok: false; error: string };
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
  openPrivateRoom: (clientId: string) => void;
  openGroupRoom: (groupId: string) => void;
  closeRoom: (roomId: string) => void;
  setActiveRoom: (roomId: string) => void;
  sendMessage: (roomId: string, text: string) => void;
}

const ChatStoreContext = createContext<ChatStoreValue | null>(null);

export function ChatStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>[]>>({});

  const join = useCallback(
    (name: string): { ok: true } | { ok: false; error: string } => {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: "Enter a name to join the chat." };
      if (trimmed.length > 24) {
        return { ok: false, error: "Keep your name under 24 characters." };
      }
      const taken = state.clients.some(
        (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (taken) {
        return { ok: false, error: `"${trimmed}" is already taken. Try another name.` };
      }
      const client: Client = {
        id: `self-${Date.now()}`,
        name: trimmed,
        isSelf: true,
        online: true,
      };
      const privateHistories: Record<string, Message[]> = {};
      for (const other of state.clients) {
        privateHistories[privateRoomId(other.id)] = generatePrivateHistory(client, other);
      }
      dispatch({ type: "JOIN", client, privateHistories });
      return { ok: true };
    },
    [state.clients],
  );

  const createGroup = useCallback(
    (name: string): { ok: true } | { ok: false; error: string } => {
      const trimmed = name.trim();
      if (!state.currentUser) return { ok: false, error: "Join the chat first." };
      if (!trimmed) return { ok: false, error: "Give your group a name." };
      const taken = state.groups.some(
        (g) => g.name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (taken) return { ok: false, error: `A group named "${trimmed}" already exists.` };
      const group: Group = {
        id: `g-${trimmed.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
        name: trimmed,
        createdBy: state.currentUser.id,
        memberIds: [state.currentUser.id],
      };
      dispatch({ type: "CREATE_GROUP", group });
      const roomId = groupRoomId(group.id);
      dispatch({ type: "OPEN_ROOM", roomId });
      dispatch({ type: "SET_ACTIVE", roomId });
      return { ok: true };
    },
    [state.currentUser, state.groups],
  );

  const joinGroup = useCallback(
    (groupId: string) => {
      if (!state.currentUser) return;
      // Joining only grants membership — it doesn't navigate into the room.
      dispatch({ type: "JOIN_GROUP", groupId, clientId: state.currentUser.id });
    },
    [state.currentUser],
  );

  const leaveGroup = useCallback(
    (groupId: string) => {
      if (!state.currentUser) return;
      dispatch({ type: "LEAVE_GROUP", groupId, clientId: state.currentUser.id });
      dispatch({ type: "CLOSE_ROOM", roomId: groupRoomId(groupId) });
    },
    [state.currentUser],
  );

  const openPrivateRoom = useCallback((clientId: string) => {
    const roomId = privateRoomId(clientId);
    dispatch({ type: "OPEN_ROOM", roomId });
    dispatch({ type: "SET_ACTIVE", roomId });
  }, []);

  const openGroupRoom = useCallback((groupId: string) => {
    const roomId = groupRoomId(groupId);
    dispatch({ type: "OPEN_ROOM", roomId });
    dispatch({ type: "SET_ACTIVE", roomId });
  }, []);

  const closeRoom = useCallback((roomId: string) => {
    dispatch({ type: "CLOSE_ROOM", roomId });
  }, []);

  const setActiveRoom = useCallback((roomId: string) => {
    dispatch({ type: "SET_ACTIVE", roomId });
  }, []);

  const logout = useCallback(() => {
    for (const roomTimers of Object.values(timers.current)) {
      for (const t of roomTimers) clearTimeout(t);
    }
    timers.current = {};
    dispatch({ type: "RESET" });
  }, []);

  const sendMessage = useCallback(
    (roomId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !state.currentUser) return;
      dispatch({
        type: "SEND_MESSAGE",
        roomId,
        message: {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          roomId,
          senderId: state.currentUser.id,
          senderName: state.currentUser.name,
          text: trimmed,
          timestamp: Date.now(),
          isSelf: true,
        },
      });

      const meta = roomMeta(roomId, state.clients, state.groups);
      if (!meta) return;

      let replySenderId: string | null = null;
      let replySenderName: string | null = null;
      if (meta.kind === "private") {
        replySenderId = meta.refId;
        replySenderName = meta.name;
      } else if (meta.group) {
        const candidates = meta.group.memberIds.filter(
          (id) => id !== state.currentUser?.id,
        );
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        const client = state.clients.find((c) => c.id === pick);
        if (client) {
          replySenderId = client.id;
          replySenderName = client.name;
        }
      }
      if (!replySenderId || !replySenderName) return;

      for (const t of timers.current[roomId] ?? []) clearTimeout(t);
      const typingTimer = setTimeout(() => {
        dispatch({ type: "SET_TYPING", roomId, typing: true });
      }, 350);
      const replyTimer = setTimeout(() => {
        dispatch({ type: "SET_TYPING", roomId, typing: false });
        dispatch({
          type: "SEND_MESSAGE",
          roomId,
          message: {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            roomId,
            senderId: replySenderId!,
            senderName: replySenderName!,
            text: nextAutoReply(),
            timestamp: Date.now(),
            isSelf: false,
          },
        });
      }, AUTO_REPLY_TYPING_MS);
      timers.current[roomId] = [typingTimer, replyTimer];
    },
    [state.currentUser, state.clients, state.groups],
  );

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
