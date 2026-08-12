const TOKEN_KEY = 'wf_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

let csrfToken: string | null = null

async function fetchCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken
  try {
    const res = await fetch('/api/csrf/', { credentials: 'same-origin' })
    if (!res.ok) return ''
    const data = (await res.json().catch(() => ({}))) as { token?: string }
    csrfToken = data.token ?? ''
  } catch {
    csrfToken = ''
  }
  return csrfToken
}

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
}

export interface OrderAddress {
  id: number
  source: number | null
  state: string
  city: string
  street: string
  room: string
  postal_code: string
}

export interface OrderItem {
  id: number
  name: string
  description: string
  quantity: number
  unit: string
  amount: string
  currency: string
  discount?: string
  tax?: string
}

export interface Order {
  id: number
  user: number
  external_id: string
  amount: string
  currency: string
  status: string
  materials: string
  materials_display: string
  description: string
  notes: string
  comment: string
  executors: number[]
  created_at: string
  address: OrderAddress | null
  project: number | null
  items: OrderItem[]
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

export interface Service {
  id: number
  name: string
  description: string
  amount: string
  currency: string
  status: string
  status_display: string
  created_at: string
}

export interface Material {
  id: number
  name: string
  created_at: string
}

export interface Project {
  id: number
  name: string
  description: string
  start_time: string | null
  duration: number
  duration_to: number
  duration_unit: string
  available_from: string | null
  available_to: string | null
  created_at: string
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

export type OrderItemPayload = Omit<OrderItem, 'id'>

export interface OrderPayload extends Omit<Partial<Order>, 'address' | 'items'> {
  address?: Partial<OrderAddress> | null
  project?: number | null
  items?: OrderItemPayload[]
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
  const method = (options.method || 'GET').toUpperCase()
  const unsafe = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
  if (unsafe) await fetchCsrfToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  const token = getToken()
  if (token) headers.Authorization = `Token ${token}`
  if (unsafe && csrfToken) headers['X-CSRFToken'] = csrfToken

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
  recentUsers: () => request<User[]>('/users/recent/'),
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
  createOrder: (payload: OrderPayload) =>
    request<Order>('/orders/', { method: 'POST', body: JSON.stringify(payload) }),
  order: (id: number) => request<Order>(`/orders/${id}/`),
  updateOrder: (id: number, payload: OrderPayload) =>
    request<Order>(`/orders/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  services: () => request<Service[]>('/services/'),
  createService: (payload: Partial<Service>) =>
    request<Service>('/services/', { method: 'POST', body: JSON.stringify(payload) }),
  service: (id: number) => request<Service>(`/services/${id}/`),
  updateService: (id: number, payload: Partial<Service>) =>
    request<Service>(`/services/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteService: (id: number) => request<void>(`/services/${id}/`, { method: 'DELETE' }),
  materials: () => request<Material[]>('/materials/'),
  createMaterial: (payload: Partial<Material>) =>
    request<Material>('/materials/', { method: 'POST', body: JSON.stringify(payload) }),
  material: (id: number) => request<Material>(`/materials/${id}/`),
  updateMaterial: (id: number, payload: Partial<Material>) =>
    request<Material>(`/materials/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteMaterial: (id: number) => request<void>(`/materials/${id}/`, { method: 'DELETE' }),
  projects: (search?: string) =>
    request<Project[]>(`/projects/${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createProject: (payload: Partial<Project>) =>
    request<Project>('/projects/', { method: 'POST', body: JSON.stringify(payload) }),
  project: (id: number) => request<Project>(`/projects/${id}/`),
  updateProject: (id: number, payload: Partial<Project>) =>
    request<Project>(`/projects/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  invoices: () => request<Invoice[]>('/invoices/'),
  payments: () => request<Payment[]>('/payments/'),
  apiKeys: () => request<ApiKey[]>('/api-keys/'),
  createApiKey: (name: string) =>
    request<ApiKey>('/api-keys/', { method: 'POST', body: JSON.stringify({ name }) }),
  toggleApiKey: (id: number, active: boolean) =>
    request<ApiKey>(`/api-keys/${id}/`, { method: 'PATCH', body: JSON.stringify({ active }) }),
  deleteApiKey: (id: number) => request<void>(`/api-keys/${id}/`, { method: 'DELETE' }),
}