import { apiFetch, setToken } from "./client";
import type { ApiClient } from "./types";

async function authenticate(path: string, name: string, password: string): Promise<ApiClient> {
  const res = await apiFetch<{ token: string; client: ApiClient }>(path, {
    method: "POST",
    body: JSON.stringify({ name, password }),
  });
  setToken(res.token);
  return res.client;
}

export function register(name: string, password: string): Promise<ApiClient> {
  return authenticate("/auth/register", name, password);
}

export function login(name: string, password: string): Promise<ApiClient> {
  return authenticate("/auth/login", name, password);
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<void>("/auth/logout", { method: "DELETE" });
  } finally {
    setToken(null);
  }
}
