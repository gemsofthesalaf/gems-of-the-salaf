// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { encode } from 'next-auth/jwt'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'

describe('administrator session boundary', () => {
  it('accepts the actual NextAuth cookie after successful login', async () => {
    const secret = 'isolated-test-secret-at-least-thirty-two-characters'
    vi.stubEnv('NEXTAUTH_SECRET', secret)
    const token = await encode({ secret, token: { id: 'test-admin', role: 'admin' } })
    const cookieName = process.env.NODE_ENV === 'production' ? '__Secure-gems.session-token' : 'gems.session-token'
    const response = await proxy(new NextRequest('http://localhost:3000/admin', {
      headers: { cookie: `${cookieName}=${token}` },
    }))
    expect(response.headers.get('location')).toBeNull()
    vi.unstubAllEnvs()
  })
})
