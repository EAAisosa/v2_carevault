"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type ApiOptions = Omit<RequestInit, "body"> & { body?: unknown };

async function request<T>(path: string, token: string | null, options: ApiOptions = {}): Promise<T> {
  const { body, headers: extraHeaders, ...rest } = options;

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(extraHeaders ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: res.statusText }));
    const err = new Error((data as { message?: string }).message ?? `${res.status} ${res.statusText}`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function createApiClient(token: string | null) {
  return {
    get: <T>(path: string) => request<T>(path, token, { method: "GET" }),
    post: <T>(path: string, body?: unknown) => request<T>(path, token, { method: "POST", body }),
    patch: <T>(path: string, body?: unknown) => request<T>(path, token, { method: "PATCH", body }),
    delete: <T>(path: string) => request<T>(path, token, { method: "DELETE" }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
