const TOKEN_KEY = 'wf_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
}

export interface Order {
  id: number
  user: number
  external_id: string
  amount: string
  currency: string
  status: string
  description: string
  created_at: string
}

export interface Invoice {
  id: number
  number: string
  order: number | null
  amount: string
  currency: string
  status: string
  status_display: string
  due_date: string | null
  issued_at: string
  paid_at: string | null
}

export interface Payment {
  id: number
  invoice: number | null
  external_ref: string
  amount: string
  currency: string
  method: string
  method_display: string
  status: string
  status_display: string
  created_at: string
}

export interface ApiKey {
  id: number
  name: string
  key: string
  active: boolean
  created_at: string
  last_used_at: string | null
}

export interface Address {
  id: number
  state: string
  city: string
  street: string
  room: string
  postal_code: string
  is_default: boolean
  created_at: string
}

export interface PlaceSuggestion {
  place_id: string
  main_text: string
  secondary_text: string
  description: string
}

export interface PlaceDetails {
  formatted_address: string
  street: string
  city: string
  state: string
  postal_code: string
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  const token = getToken()
  if (token) headers.Authorization = `Token ${token}`

  const res = await fetch(`/api${path}`, { ...options, headers })

  if (res.status === 401) {
    setToken(null)
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = (body as Record<string, unknown>).detail
    throw new Error(typeof detail === 'string' ? detail : `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<User>('/auth/me/'),
  searchUsers: (term: string) =>
    request<User[]>(`/users/?search=${encodeURIComponent(term)}`),
  createUser: (payload: { username: string; password: string; first_name?: string; last_name?: string; email?: string }) =>
    request<User>('/users/', { method: 'POST', body: JSON.stringify(payload) }),
  user: (id: number) => request<User>(`/users/${id}/`),
  updateUser: (id: number, payload: Partial<User> & { password?: string }) =>
    request<User>(`/users/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  userOrders: (id: number) => request<Order[]>(`/users/${id}/orders/`),
  addresses: (userId: number) => request<Address[]>(`/users/${userId}/addresses/`),
  createAddress: (userId: number, payload: Partial<Address>) =>
    request<Address>(`/users/${userId}/addresses/`, { method: 'POST', body: JSON.stringify(payload) }),
  updateAddress: (userId: number, id: number, payload: Partial<Address>) =>
    request<Address>(`/users/${userId}/addresses/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteAddress: (userId: number, id: number) =>
    request<void>(`/users/${userId}/addresses/${id}/`, { method: 'DELETE' }),
  placesAutocomplete: (q: string) =>
    request<{ results: PlaceSuggestion[] }>(`/places/autocomplete/?q=${encodeURIComponent(q)}`),
  placeDetails: (placeId: string) =>
    request<PlaceDetails>(`/places/details/?place_id=${encodeURIComponent(placeId)}`),
  orders: () => request<Order[]>('/orders/'),
  createOrder: (payload: Partial<Order>) =>
    request<Order>('/orders/', { method: 'POST', body: JSON.stringify(payload) }),
  order: (id: number) => request<Order>(`/orders/${id}/`),
  updateOrder: (id: number, payload: Partial<Order>) =>
    request<Order>(`/orders/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  invoices: () => request<Invoice[]>('/invoices/'),
  payments: () => request<Payment[]>('/payments/'),
  apiKeys: () => request<ApiKey[]>('/api-keys/'),
  createApiKey: (name: string) =>
    request<ApiKey>('/api-keys/', { method: 'POST', body: JSON.stringify({ name }) }),
  toggleApiKey: (id: number, active: boolean) =>
    request<ApiKey>(`/api-keys/${id}/`, { method: 'PATCH', body: JSON.stringify({ active }) }),
  deleteApiKey: (id: number) => request<void>(`/api-keys/${id}/`, { method: 'DELETE' }),
}