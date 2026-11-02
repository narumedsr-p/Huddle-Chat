import { apiFetch } from "./client";
import type { ApiMessage } from "./types";

export function searchRoom(
  roomId: string,
  query: string,
): Promise<{ matches: ApiMessage[] }> {
  return apiFetch<{ matches: ApiMessage[] }>(
    `/rooms/${encodeURIComponent(roomId)}/search?q=${encodeURIComponent(query)}`,
  );
}

