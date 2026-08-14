import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api'
import { AuthProvider } from '../components/AuthContext'
import Settings from './Settings'

vi.mock('../api', () => ({
  api: {
    updateUser: vi.fn(),
    authStatus: vi.fn(),
  },
}))

function renderSettings() {
  return render(
    <MemoryRouter>
      <AuthProvider initial={{ user: { id: 1, username: 'user12345678', email: 'user@example.com', first_name: 'John', last_name: 'Doe' }, authenticated: true }}>
        <Settings />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Settings', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('pre-fills the form with the current user', () => {
    renderSettings()
    expect((screen.getByLabelText('Username') as HTMLInputElement).value).toBe('user12345678')
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('user@example.com')
    expect((screen.getByLabelText('First name') as HTMLInputElement).value).toBe('John')
  })

  it('saves changes via updateUser', async () => {
    ;(api.updateUser as ReturnType<typeof vi.fn>).mockResolvedValue({})
    renderSettings()
    const firstName = screen.getByLabelText('First name')
    await userEvent.clear(firstName)
    await userEvent.type(firstName, 'Jane')
    await userEvent.click(screen.getByText('Save changes'))
    await waitFor(() => {
      expect(api.updateUser).toHaveBeenCalledWith(1, {
        username: 'user12345678',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'user@example.com',
        password: undefined,
      })
    })
    expect(await screen.findByText('Settings saved.')).toBeInTheDocument()
  })
})
