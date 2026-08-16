const TOKEN_KEY = 'wf_token'

const API_PREFIX = '/a'
const API_VERSION = 'v1'

function apiUrl(path: string): string {
  return `${API_PREFIX}/api/${API_VERSION}${path.replace(/\/+(?=\?|$)/, '')}`
}

function configUrl(): string {
  return `${API_PREFIX}/api/config`
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export interface AppConfig {
  csrf: string
  locale: string
  time: string
  timezone: string
}

let config: AppConfig | null = null
let configFailed = false

export function isConfigFailed(): boolean {
  return configFailed
}

export async function loadConfig(): Promise<AppConfig> {
  if (config) return config
  configFailed = false
  try {
    const res = await fetch(configUrl(), { credentials: 'same-origin' })
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as Partial<AppConfig>
      config = { csrf: data.csrf ?? '', locale: data.locale ?? 'en-us', time: data.time ?? '', timezone: data.timezone ?? 'UTC' }
    } else {
      configFailed = true
    }
  } catch {
    configFailed = true
  }
  config = config ?? { csrf: '', locale: 'en-us', time: '', timezone: 'UTC' }
  return config
}

export function getCsrfToken(): string {
  return config?.csrf ?? ''
}

export interface AuthStatusResult {
  user: User | null
  authenticated: boolean
  failed: boolean
}

export async function fetchAuthStatus(): Promise<AuthStatusResult> {
  try {
    const headers: Record<string, string> = {}
    const token = getToken()
    if (token) headers.Authorization = `Token ${token}`
    const res = await fetch(apiUrl('/auth/status/'), { credentials: 'same-origin', headers })
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        user?: User | null
        authenticated?: boolean
      }
      return { user: data.user ?? null, authenticated: !!data.authenticated, failed: false }
    }
    return { user: null, authenticated: false, failed: true }
  } catch {
    return { user: null, authenticated: false, failed: true }
  }
}

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  online?: boolean
  account_type?: string
}

export interface AccountType {
  id: number
  name: string
  description: string
}

export interface Account {
  id: number
  uuid: string
  account_type: AccountType
  user: User
  created_at: string
}

export interface OrderAddress {
  id: number
  source: number | null
  country: string
  state: string
  city: string
  street: string
  building: string
  unit: string
  zip: string
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
  short_description: string
  description: string
  features: string
  tags: string
  price: string
  old_price: string
  duration_start: number
  duration_end: number
  duration_unit: string
  currency: string
  status: string
  status_display: string
  category_id: number | null
  location_links: ServiceLocationLink[]
  images: ServiceImage[]
  created_at: string
  deleted?: boolean
}

export interface ServiceImage {
  id: number
  uri: string
  url: string
  order: number
  created_at: string
}

export interface ServiceLocationLink {
  location_id: number
  location_name: string
}

export interface Category {
  id: number
  account_id: string | null
  name: string
  full_name: string
  description: string
  tags: string
  created_at: string
  updated_at: string
}

export interface Location {
  id: number
  account_id: string | null
  location: string
  full_location: string
  latitude: number | null
  longitude: number | null
  country: string
  type: string
  city: string
  county: string
  state: string
  short_state: string
  postal_code: string
  description: string
  tags: string
  service_links: LocationServiceLink[]
  location_services?: { service_id: number }[]
  created_at: string
  updated_at: string
}

export interface LocationServiceLink {
  service_id: number
  service_name: string
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
  deleted?: boolean
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
  account_id: string | null
  name: string
  key: string
  domain_id: number | null
  description: string
  created_at: string
  updated_at: string
}

export interface ApiDomain {
  id: number
  account: string | null
  domain: string
  description: string
  created_at: string
  updated_at: string
}

export interface Address {
  id: number
  country: string
  state: string
  city: string
  street: string
  building: string
  unit: string
  zip: string
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
  types?: string[]
}

export interface PlaceDetails {
  formatted_address: string
  street: string
  city: string
  state: string
  postal_code: string
  county: string
  country: string
  short_state: string
  latitude: number | null
  longitude: number | null
}

export interface Company {
  id: number
  name: string
  description: string
  ein: string
  website: string
  phone: string
  created_at: string
  updated_at: string
}

async function request<T>(path: string, options: RequestInit = {}, redirectOn401 = true): Promise<T> {
  if (config === null) await loadConfig()

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Token ${token}`
  if (config?.csrf) headers['X-CSRFToken'] = config.csrf

  const res = await fetch(apiUrl(path), { ...options, headers })

  if (res.status === 401) {
    setToken(null)
    if (redirectOn401) window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const text = await res.text()
    const body = (() => {
      try {
        return JSON.parse(text) as Record<string, unknown>
      } catch {
        return {}
      }
    })()
    const detail = body.detail
    if (typeof detail === 'string') throw new Error(detail)
    if (body && typeof body === 'object') {
      const firstFieldError = Object.values(body).find(
        (v) => typeof v === 'string' || (Array.isArray(v) && typeof v[0] === 'string'),
      )
      if (typeof firstFieldError === 'string') throw new Error(firstFieldError)
      if (Array.isArray(firstFieldError) && typeof firstFieldError[0] === 'string') {
        throw new Error(firstFieldError[0])
      }
    }
    if (res.status >= 500) {
      const exc = text.match(/Exception Value[^<]*<pre[^>]*>([\s\S]*?)<\/pre>/)
      const title = text.match(/<title>([\s\S]*?)<\/title>/)
      if (exc) throw new Error(exc[1].trim())
      if (title) throw new Error(title[1].trim())
    }
    throw new Error(`Request failed (${res.status})`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

function placesKey(): string {
  return (import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined) ?? ''
}

interface PlacePrediction {
  place_id: string
  description: string
  types?: string[]
  structured_formatting?: { main_text: string; secondary_text: string }
}

interface PlaceResult {
  formatted_address?: string
  address_components?: Array<{ long_name?: string; short_name?: string; types: string[] }>
  geometry?: { location: { lat: () => number; lng: () => number } }
}

interface GooglePlacesLib {
  AutocompleteService: new () => {
    getPlacePredictions(
      req: {
        input: string
        componentRestrictions?: { country: string }
        types?: string[]
      },
      cb: (predictions: PlacePrediction[] | null, status: string) => void,
    ): void
  }
  PlacesService: new (el: HTMLElement) => {
    getDetails(
      req: { placeId: string },
      cb: (place: PlaceResult | null, status: string) => void,
    ): void
  }
  PlacesServiceStatus: Record<string, string>
}

declare global {
  interface Window {
    google?: { maps?: { places?: GooglePlacesLib } }
  }
}

let placesScriptPromise: Promise<GooglePlacesLib> | null = null

function loadPlacesScript(): Promise<GooglePlacesLib> {
  if (placesScriptPromise) return placesScriptPromise
  placesScriptPromise = new Promise((resolve, reject) => {
    const key = placesKey()
    if (!key) {
      reject(new Error('Google Places API key is not configured'))
      return
    }
    const existing = window.google?.maps?.places
    if (existing) {
      resolve(existing)
      return
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&language=en`
    script.async = true
    script.onload = () => {
      const places = window.google?.maps?.places
      if (places) resolve(places)
      else reject(new Error('Google Places library failed to load'))
    }
    script.onerror = () => reject(new Error('Failed to load Google Places script'))
    document.head.appendChild(script)
  })
  return placesScriptPromise
}

async function placesAutocomplete(q: string): Promise<{ results: PlaceSuggestion[] }> {
  const places = await loadPlacesScript()
  return new Promise((resolve) => {
    const service = new places.AutocompleteService()
    service.getPlacePredictions(
      { input: q, componentRestrictions: { country: 'us' }, types: ['(regions)'] },
      (predictions, status) => {
        if (status !== places.PlacesServiceStatus.OK || !predictions) {
          resolve({ results: [] })
          return
        }
        resolve({
          results: predictions.map((p) => ({
            place_id: p.place_id,
            main_text: p.structured_formatting?.main_text ?? p.description,
            secondary_text: p.structured_formatting?.secondary_text ?? '',
            description: p.description,
            types: p.types,
          })),
        })
      },
    )
  })
}

async function placeDetails(placeId: string): Promise<PlaceDetails> {
  const places = await loadPlacesScript()
  return new Promise((resolve) => {
    const service = new places.PlacesService(document.createElement('div'))
    service.getDetails({ placeId }, (place, status) => {
      if (status !== places.PlacesServiceStatus.OK || !place) {
        resolve({
          formatted_address: '', street: '', city: '', state: '', postal_code: '',
          county: '', country: '', short_state: '', latitude: null, longitude: null,
        })
        return
      }
      const components = place.address_components ?? []

      function byType(types: string[]): string {
        return (
          components.find((c) => types.some((t) => c.types.includes(t)))?.long_name ?? ''
        )
      }
      function byShortType(types: string[]): string {
        return (
          components.find((c) => types.some((t) => c.types.includes(t)))?.short_name ?? ''
        )
      }

      const streetNumber = byType(['street_number'])
      const route = byType(['route'])
      const geometry = place.geometry?.location
      const round6 = (n: number) => Math.round(n * 1e6) / 1e6
      resolve({
        formatted_address: place.formatted_address ?? '',
        street: `${streetNumber} ${route}`.trim(),
        city: byType(['locality', 'sublocality_level_1', 'administrative_area_level_2']),
        state: byType(['administrative_area_level_1']),
        postal_code: byType(['postal_code']),
        county: byType(['administrative_area_level_2']),
        country: byType(['country']),
        short_state: byShortType(['administrative_area_level_1']),
        latitude: geometry ? round6(geometry.lat()) : null,
        longitude: geometry ? round6(geometry.lng()) : null,
      })
    })
  })
}

export const api = {  login: (username: string) =>
    request<{ token: string; user: User }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),
  loginCheck: (username: string) =>
    request<{ password_set: boolean; email: string }>('/auth/login/check/', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),
  loginPassword: (username: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login/password/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  loginSendCode: (username: string) =>
    request<{ code: string; expires_at: string; email: string }>('/auth/login/send-code/', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),
  loginCheckCode: (email: string) =>
    request<{ active: boolean; expires_at?: string }>('/auth/login/check-code/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  loginConfirm: (email: string, code: string) =>
    request<{ token: string; user: User }>('/auth/login/confirm/', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),
  register: (payload: { account_type?: string; firstname?: string; midname?: string; lastname?: string; email?: string; company_name?: string; ein?: string }) =>
    request<{ code: string; user: { id: number; username: string; email: string } }>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  confirm: (payload: { code: string; email: string; password?: string }) =>
    request<{ detail: string }>('/auth/confirm/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  resendCode: (email: string) =>
    request<{ code: string; expires_at: string }>('/auth/resend-code/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  checkRegistration: (email: string) =>
    request<{ active: boolean; expires_at?: string }>('/auth/check-registration/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  completeRegistration: (payload: { email: string; username?: string; password: string; two_factor: boolean }) =>
    request<{ token: string; user: User }>('/auth/complete-registration/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  me: () => request<User>('/auth/me/'),
  authStatus: () => request<{ authenticated: boolean; user: User | null }>('/auth/status/'),
  account: (uuid?: string) =>
    request<Account>(uuid ? `/account/${encodeURIComponent(uuid)}` : '/account', {}, false),
  accountTypes: () => request<AccountType[]>('/account-types/'),
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
  placesAutocomplete: (q: string) => placesAutocomplete(q),
  placeDetails: (placeId: string) => placeDetails(placeId),
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
  restoreService: (id: number) =>
    request<Service>(`/services/${id}/restore`, { method: 'POST' }),
  categories: (search?: string) =>
    request<Category[]>(`/categories/${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  category: (id: number) => request<Category>(`/categories/${id}/`),
  createCategory: (name: string, fullName = '', description = '', tags = '') =>
    request<Category>('/categories/', {
      method: 'POST',
      body: JSON.stringify({ name, full_name: fullName, description, tags }),
    }),
  deleteCategory: (id: number) => request<void>(`/categories/${id}/`, { method: 'DELETE' }),
  updateCategory: (id: number, name: string, fullName = '', description = '', tags = '') =>
    request<Category>(`/categories/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ name, full_name: fullName, description, tags }),
    }),
  locations: (search?: string) =>
    request<Location[]>(`/locations/${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  location: (id: number) => request<Location>(`/locations/${id}/`),
  createLocation: (payload: Partial<Location>) =>
    request<Location>('/locations/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateLocation: (id: number, payload: Partial<Location>) =>
    request<Location>(`/locations/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteLocation: (id: number) => request<void>(`/locations/${id}/`, { method: 'DELETE' }),
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
  deleteProject: (id: number) => request<void>(`/projects/${id}/`, { method: 'DELETE' }),
  restoreProject: (id: number) =>
    request<Project>(`/projects/${id}/restore`, { method: 'POST' }),
  invoices: () => request<Invoice[]>('/invoices/'),
  payments: () => request<Payment[]>('/payments/'),
  apiKeys: (account_id: string | null = null) =>
    request<ApiKey[]>('/api-keys', { method: 'POST', body: JSON.stringify({ account_id }) }),
  companies: () => request<Company[]>('/companies/'),
  createCompany: (payload: {
    name: string
    ein?: string
    description?: string
    website?: string
    phone?: string
    address?: Partial<Address> | null
  }) =>
    request<Company>('/companies/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createApiKey: (name: string, description = '', domain_id: number | null = null, account_id: string | null = null) =>
    request<ApiKey>('/api-keys/create', {
      method: 'POST',
      body: JSON.stringify({ name, description, domain_id, account_id }),
    }),
  deleteApiKey: (id: number) => request<void>(`/api-keys/${id}`, { method: 'DELETE' }),
  apiDomains: (account_id: string | null = null) =>
    request<ApiDomain[]>('/api-domains', { method: 'POST', body: JSON.stringify({ account_id }) }),
  createApiDomain: (domain: string, description = '', account_id: string | null = null) =>
    request<ApiDomain>('/api-domains/create', {
      method: 'POST',
      body: JSON.stringify({ domain, description, account_id }),
    }),
  deleteApiDomain: (id: number) => request<void>(`/api-domains/${id}`, { method: 'DELETE' }),
}