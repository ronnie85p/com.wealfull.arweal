import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api'
import Security from './Security'

vi.mock('../api', () => ({
  api: {
    completeRegistration: vi.fn(),
  },
  setToken: vi.fn(),
}))

function renderSecurity(stateEmail?: string) {
  const state = stateEmail ? { state: { email: stateEmail } } : undefined
  return render(
    <MemoryRouter initialEntries={[{ ...state, pathname: '/security' }]}>
      <Routes>
        <Route path="/security" element={<Security />} />
        <Route path="/register" element={<div>Register page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Security', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('redirects to /register when no email', async () => {
    renderSecurity()
    expect(await screen.findByText('Register page')).toBeInTheDocument()
  })

  it('shows the form when an email is provided', () => {
    renderSecurity('user@example.com')
    expect(screen.getByText('Secure your account')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Login/)).toBeInTheDocument()
  })

  it('pre-fills the login from localStorage registration username', () => {
    localStorage.setItem('wf_registration_email', 'user@example.com')
    localStorage.setItem('wf_registration_username', 'user12345678')
    renderSecurity()
    const login = screen.getByLabelText(/^Login/) as HTMLInputElement
    expect(login.value).toBe('user12345678')
  })

  it('submits username, password and two_factor', async () => {
    localStorage.setItem('wf_registration_email', 'user@example.com')
    localStorage.setItem('wf_registration_username', 'user12345678')
    ;(api.completeRegistration as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: 'tok',
      user: { id: 1, username: 'user12345678', email: 'user@example.com', first_name: '', last_name: '' },
    })
    renderSecurity()
    await userEvent.click(screen.getByText('Set password'))
    await userEvent.type(screen.getByLabelText('Password'), 'Str0ng!pass')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Str0ng!pass')
    await userEvent.click(screen.getByText('Finish setup'))
    await waitFor(() => {
      expect(api.completeRegistration).toHaveBeenCalledWith({
        email: 'user@example.com',
        username: 'user12345678',
        password: 'Str0ng!pass',
        two_factor: false,
      })
    })
  })

  it('shows an error when passwords do not match', async () => {
    localStorage.setItem('wf_registration_email', 'user@example.com')
    renderSecurity()
    await userEvent.click(screen.getByText('Set password'))
    await userEvent.type(screen.getByLabelText('Password'), 'Str0ng!pass')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Different!1')
    await userEvent.click(screen.getByText('Finish setup'))
    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
    expect(api.completeRegistration).not.toHaveBeenCalled()
  })
})
