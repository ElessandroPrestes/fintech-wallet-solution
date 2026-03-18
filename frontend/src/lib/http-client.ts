// API_URL é usada em Server Actions/Components (rede interna Docker: http://backend:3001)
// NEXT_PUBLIC_API_URL é o fallback para desenvolvimento local e chamadas do browser
const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
  cache?: RequestCache;
  tags?: string[];
};

export async function httpClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, cache = 'no-store', tags } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache,
    ...(tags ? { next: { tags } } : {}),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, errorBody?.message ?? 'Erro inesperado');
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}
