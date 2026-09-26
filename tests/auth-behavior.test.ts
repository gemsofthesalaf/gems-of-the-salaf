// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import bcrypt from 'bcrypt'
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), rpc: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(),
}))
vi.mock('next-auth', () => ({ getServerSession: mocks.getSession }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => mocks }))
import { authOptions } from '@/lib/auth'
import { requireAdmin } from '@/lib/authz'

const authorize = (authOptions.providers[0] as unknown as {
  options: { authorize: (credentials: { email: string; password: string }) => Promise<unknown> }
}).options.authorize
const callbacks = authOptions.callbacks!
const hash = await bcrypt.hash('isolated-test-password', 4)
const version = createHash('sha256').update(hash).digest('hex')
beforeEach(() => {
  vi.clearAllMocks()
  mocks.from.mockReturnValue(mocks); mocks.select.mockReturnValue(mocks); mocks.eq.mockReturnValue(mocks)
  mocks.rpc.mockResolvedValue({ data: true, error: null })
  mocks.maybeSingle.mockResolvedValue({ data: { id: 'admin-1', email: 'test@example.com', role: 'admin', password_hash: hash }, error: null })
  mocks.getSession.mockResolvedValue({ user: { id: 'admin-1', role: 'admin', credentialVersion: version } })
})
describe('credential verification and fresh authorization', () => {
  it('accepts a valid password and queries an exact normalized email', async () => {
    expect(await authorize({ email: ' TEST@example.com ', password: 'isolated-test-password' })).toMatchObject({ id: 'admin-1' })
    expect(mocks.eq).toHaveBeenCalledWith('email', 'test@example.com')
    expect(mocks.rpc).toHaveBeenCalledWith('consume_login_attempt', { p_key: expect.stringMatching(/^[a-f0-9]{64}$/) })
  })
  it('rejects incorrect passwords, missing users, and exhausted login budgets', async () => {
    expect(await authorize({ email: 'test@example.com', password: 'incorrect' })).toBeNull()
    mocks.maybeSingle.mockResolvedValue({ data: null })
    expect(await authorize({ email: 'missing@example.com', password: 'incorrect' })).toBeNull()
    mocks.rpc.mockResolvedValue({ data: false, error: null })
    mocks.from.mockClear()
    expect(await authorize({ email: 'test@example.com', password: 'isolated-test-password' })).toBeNull()
    expect(mocks.from).not.toHaveBeenCalled()
  })
  it('fails closed on rate-limit storage failure', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'offline' } })
    expect(await authorize({ email: 'test@example.com', password: 'isolated-test-password' })).toBeNull()
    expect(mocks.from).not.toHaveBeenCalled()
  })
  it('rejects passwords exceeding bcrypt byte limit', async () => {
    expect(await authorize({ email: 'test@example.com', password: '界'.repeat(25) })).toBeNull()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('requires a session and rechecks the database on each authorization', async () => {
    expect(await requireAdmin()).toEqual({ id: 'admin-1', email: 'test@example.com' })
    mocks.getSession.mockResolvedValue(null)
    await expect(requireAdmin()).rejects.toThrow('not authorized')
    mocks.getSession.mockResolvedValue({ user: { id: 'admin-1', role: 'admin', credentialVersion: version } })
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    await expect(requireAdmin()).rejects.toThrow('not authorized')
  })
  it('revokes existing sessions after a password reset', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: 'admin-1', role: 'admin', password_hash: 'different-hash' }, error: null })
    await expect(requireAdmin()).rejects.toThrow('not authorized')
  })
  it('enforces an absolute eight-hour session lifetime despite token renewal', async () => {
    const jwt = callbacks.jwt as (input: { token: Record<string, unknown> }) => Promise<Record<string, unknown>>
    expect((await jwt({ token: { role: 'admin', loginAt: Math.floor(Date.now()/1000) - 28801 } })).role).toBeNull()
    expect((await jwt({ token: { role: 'admin', loginAt: Math.floor(Date.now()/1000) - 10 } })).role).toBe('admin')
  })
  it('keeps redirects on the configured site', async () => {
    const redirect = callbacks.redirect!
    expect(await redirect({ url: 'https://attacker.invalid/admin', baseUrl: 'https://example.com' })).toBe('https://example.com/admin')
    expect(await redirect({ url: '/admin', baseUrl: 'https://example.com' })).toBe('https://example.com/admin')
  })
})
