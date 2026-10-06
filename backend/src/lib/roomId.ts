import { AppError } from "./errors";

export type RoomRef =
  | { kind: "group"; groupId: string }
  | { kind: "private"; otherClientId: string };

export function parseRoomId(roomId: string): RoomRef {
  const idx = roomId.indexOf(":");
  if (idx === -1) {
    throw new AppError(400, "INVALID_ROOM_ID", `Invalid room id "${roomId}".`);
  }
  const kind = roomId.slice(0, idx);
  const ref = roomId.slice(idx + 1);
  if (!ref) throw new AppError(400, "INVALID_ROOM_ID", `Invalid room id "${roomId}".`);
  if (kind === "group") return { kind: "group", groupId: ref };
  if (kind === "private") return { kind: "private", otherClientId: ref };
  throw new AppError(400, "INVALID_ROOM_ID", `Invalid room id "${roomId}".`);
}

export function groupRoomKey(groupId: string) {
  return `group:${groupId}`;
}

export function privateRoomKey(otherClientId: string) {
  return `private:${otherClientId}`;
}

/**
 * A room key that's identical no matter which participant computes it —
 * needed for state that must be visible *across* participants (e.g. typing).
 * `roomId`/`privateRoomKey` are relative to the viewer (A's "private:B" and
 * B's "private:A" refer to the same conversation but aren't equal strings),
 * which is fine for per-viewer state like read receipts but breaks lookups
 * that need to find the other participant's row.
 */
export function canonicalRoomKey(ref: RoomRef, callerId: string): string {
  if (ref.kind === "group") return groupRoomKey(ref.groupId);
  const [a, b] = [callerId, ref.otherClientId].sort();
  return `private:${a}:${b}`;
}
