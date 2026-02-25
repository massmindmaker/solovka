const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
const IS_DEV = import.meta.env.DEV

function getInitData(): string {
  if (IS_DEV) return 'mock_init_data'
  return window.Telegram?.WebApp?.initData ?? ''
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `tma ${getInitData()}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Ошибка сети' }))
    throw new Error(err.error ?? `HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
