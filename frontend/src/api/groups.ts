import { apiFetch } from "./client";
import type { ApiGroup } from "./types";

export function listGroups(): Promise<ApiGroup[]> {
  return apiFetch<{ groups: ApiGroup[] }>("/groups").then((r) => r.groups);
}

export function createGroup(name: string): Promise<ApiGroup> {
  return apiFetch<ApiGroup>("/groups", { method: "POST", body: JSON.stringify({ name }) });
}

export function joinGroup(groupId: string): Promise<ApiGroup> {
  return apiFetch<ApiGroup>(`/groups/${encodeURIComponent(groupId)}/members`, { method: "POST" });
}

export function leaveGroup(groupId: string): Promise<void> {
  return apiFetch<void>(`/groups/${encodeURIComponent(groupId)}/members/me`, {
    method: "DELETE",
  });
}
