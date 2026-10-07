const TOKEN_STORAGE_KEY = "c3m_token";

let token: string | null = sessionStorage.getItem(TOKEN_STORAGE_KEY);

export function setToken(next: string | null) {
  token = next;
  if (next) sessionStorage.setItem(TOKEN_STORAGE_KEY, next);
  else sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function hasToken(): boolean {
  return token !== null;
}

export function getToken(): string | null {
  return token;
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api/v1${path}`, { ...init, headers });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const code = data?.error?.code ?? "UNKNOWN_ERROR";
    const message = data?.error?.message ?? "Something went wrong.";
    throw new ApiError(res.status, code, message);
  }
  return data as T;
}
