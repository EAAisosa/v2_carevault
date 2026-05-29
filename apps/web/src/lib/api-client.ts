"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type ApiOptions = Omit<RequestInit, "body"> & { body?: unknown };

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function rawRequest<T>(path: string, token: string | null, options: ApiOptions = {}): Promise<T> {
  const { body, headers: extraHeaders, ...rest } = options;

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    // credentials must be 'include' so the httpOnly refresh cookie travels on
    // /auth/* calls. The access token still rides on the Authorization header.
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(extraHeaders ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(
      (data as { message?: string; error?: string }).message
        ?? (data as { error?: string }).error
        ?? `${res.status} ${res.statusText}`,
      res.status
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Single-flight refresh: if multiple requests 401 at once, only one calls
// /auth/refresh and the rest await its result.
let refreshInFlight: Promise<string | null> | null = null;

export function createApiClient(
  token: string | null,
  onRefresh?: () => Promise<string | null>
) {
  async function request<T>(path: string, options: ApiOptions): Promise<T> {
    try {
      return await rawRequest<T>(path, token, options);
    } catch (err) {
      const is401 = err instanceof ApiError && err.status === 401;
      const isAuthRoute = path.startsWith("/auth/");
      if (!is401 || isAuthRoute || !onRefresh) throw err;

      refreshInFlight ??= onRefresh().finally(() => {
        refreshInFlight = null;
      });
      const next = await refreshInFlight;
      if (!next) throw err;
      return rawRequest<T>(path, next, options);
    }
  }

  return {
    get: <T>(path: string) => request<T>(path, { method: "GET" }),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
    patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
    delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
