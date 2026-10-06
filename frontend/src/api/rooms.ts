import { apiFetch } from "./client";
import type { ApiMessage, ApiTyper } from "./types";

export function getMessages(
  roomId: string,
  opts: { before?: number; after?: number } = {},
): Promise<{ messages: ApiMessage[]; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (opts.before) params.set("before", String(opts.before));
  if (opts.after) params.set("after", String(opts.after));
  const qs = params.toString();
  return apiFetch(`/rooms/${encodeURIComponent(roomId)}/messages${qs ? `?${qs}` : ""}`);
}

export function sendMessage(roomId: string, text: string): Promise<ApiMessage> {
  return apiFetch<ApiMessage>(`/rooms/${encodeURIComponent(roomId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function getTyping(roomId: string): Promise<ApiTyper[]> {
  return apiFetch<{ typing: ApiTyper[] }>(`/rooms/${encodeURIComponent(roomId)}/typing`).then(
    (r) => r.typing,
  );
}

export function setTyping(roomId: string, typing: boolean): Promise<void> {
  return apiFetch<void>(`/rooms/${encodeURIComponent(roomId)}/typing`, {
    method: "PUT",
    body: JSON.stringify({ typing }),
  });
}

export function markRead(roomId: string): Promise<void> {
  return apiFetch<void>(`/rooms/${encodeURIComponent(roomId)}/read`, { method: "PUT" });
}
