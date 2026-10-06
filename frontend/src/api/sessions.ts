import { apiFetch, setToken } from "./client";
import type { ApiClient } from "./types";

export async function join(name: string): Promise<ApiClient> {
  const res = await apiFetch<{ token: string; client: ApiClient }>("/sessions", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  setToken(res.token);
  return res.client;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<void>("/sessions/me", { method: "DELETE" });
  } finally {
    setToken(null);
  }
}

export function heartbeat(): Promise<void> {
  return apiFetch<void>("/sessions/me/heartbeat", { method: "POST" });
}
