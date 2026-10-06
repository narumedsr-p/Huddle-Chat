import { apiFetch } from "./client";
import type { ApiClient } from "./types";

export function listClients(): Promise<ApiClient[]> {
  return apiFetch<{ clients: ApiClient[] }>("/clients").then((r) => r.clients);
}

export function getUnreadCounts(): Promise<Record<string, number>> {
  return apiFetch<{ unreadCounts: Record<string, number> }>("/clients/me/unread-counts").then(
    (r) => r.unreadCounts,
  );
}
