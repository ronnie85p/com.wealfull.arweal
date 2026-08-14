import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api'
import Register from './Register'

vi.mock('../api', () => ({
  api: {
    accountTypes: vi.fn(),
    register: vi.fn(),
  },
}))

describe('Register', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('loads account types and renders the form', async () => {
    ;(api.accountTypes as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, name: 'Company', description: '' },
    ])
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Register />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Create your account')).toBeInTheDocument()
  })

  it('registers without sending a username, and stores returned username', async () => {
    ;(api.accountTypes as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, name: 'Company', description: '' },
    ])
    ;(api.register as ReturnType<typeof vi.fn>).mockResolvedValue({
      code: '123456',
      user: { id: 1, username: 'userabc12345', email: 'user@example.com' },
    })
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Register />
      </MemoryRouter>,
    )
    await screen.findByText('Create your account')
    await userEvent.type(screen.getByLabelText('Full Name'), 'John Doe')
    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com')
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith({
        email: 'user@example.com',
        account_type: 'Company',
        firstname: 'John',
        midname: '',
        lastname: 'Doe',
        company_name: '',
        ein: '',
      })
    })
    expect(localStorage.getItem('wf_registration_username')).toBe('userabc12345')
  })
})

