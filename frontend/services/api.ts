const getBaseUrl = (): string =>
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, token, headers: customHeaders = {} } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = path.startsWith('http') ? path : `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    ...(body !== undefined && body !== null && { body: JSON.stringify(body) }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      (data as { error?: string }).error ??
      (data as { message?: string }).message ??
      `Request failed: ${res.status} ${res.statusText}`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) =>
    request<T>(path, { method: 'GET', token }),

  post: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: 'POST', body, token }),

  put: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: 'PUT', body, token }),

  patch: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: 'PATCH', body, token }),

  delete: <T>(path: string, token?: string | null) =>
    request<T>(path, { method: 'DELETE', token }),
};

export { getBaseUrl };
