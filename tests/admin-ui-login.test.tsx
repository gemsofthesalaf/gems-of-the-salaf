import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { signIn } from 'next-auth/react'
import AdminLoginPage from '@/app/admin/login/page'
import { deferred } from './admin-ui-fixtures'

const { replace, refresh } = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }))
vi.mock('next-auth/react', () => ({ signIn: vi.fn() }))
beforeEach(() => { vi.clearAllMocks(); vi.mocked(signIn).mockReset() })

function setup() {
  render(<AdminLoginPage />)
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@example.test' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-password' } })
  return screen.getByLabelText('Email').closest('form')!
}

describe('admin login recovery', () => {
  it('retains credentials and allows a successful retry after a rejected request', async () => {
    vi.mocked(signIn).mockRejectedValueOnce(new Error('network failure')).mockResolvedValueOnce({ ok: true, status: 200, error: null, url: '/admin' })
    const form = setup()
    fireEvent.submit(form)
    expect((await screen.findByRole('alert')).textContent).toContain('Check your connection')
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('secret-password')
    expect((screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement).disabled).toBe(false)
    fireEvent.submit(form)
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin'))
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(signIn).toHaveBeenLastCalledWith('credentials', { redirect: false, email: 'admin@example.test', password: 'secret-password' })
  })

  it.each([
    undefined,
    { ok: false, status: 401, error: 'CredentialsSignin', url: null },
    { ok: true, status: 200, error: 'CredentialsSignin', url: null },
  ])('does not navigate on an unsuccessful sign-in result (%j)', async (result) => {
    vi.mocked(signIn).mockResolvedValue(result)
    fireEvent.submit(setup())
    expect((await screen.findByRole('alert')).textContent).toContain('not authorized')
    expect(replace).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('blocks duplicate requests and editing while authentication is pending', async () => {
    const request = deferred<{ ok: boolean; status: number; error: null; url: string }>()
    vi.mocked(signIn).mockReturnValue(request.promise)
    const form = setup()
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(signIn).toHaveBeenCalledTimes(1)
    expect(form.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByLabelText('Email').matches(':disabled')).toBe(true)
    expect(screen.getByLabelText('Password').matches(':disabled')).toBe(true)
    await act(async () => request.resolve({ ok: true, status: 200, error: null, url: '/admin' }))
    expect(form.getAttribute('aria-busy')).toBe('false')
  })
})
