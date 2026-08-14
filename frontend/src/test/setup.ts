import '@testing-library/jest-dom/vitest'

const storage = () => {
  let data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear() {
      data = new Map()
    },
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null
    },
    setItem(key: string, value: string) {
      data.set(key, String(value))
    },
    removeItem(key: string) {
      data.delete(key)
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null
    },
  }
}

const localStorageMock = storage()
const sessionStorageMock = storage()

Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true })
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, configurable: true })
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true })
Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock, configurable: true })