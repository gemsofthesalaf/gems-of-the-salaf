// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ authorize: vi.fn(), client: vi.fn(), revalidate: vi.fn() }))
vi.mock('@/lib/authz', () => ({ requireAdmin: mocks.authorize }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.client }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }))
import { saveQuoteAction, setQuoteStateAction, deleteQuoteAction } from '@/app/actions/quote-actions'
import { saveTaxonomyAction, deleteTaxonomyAction, mergeTagsAction } from '@/app/actions/taxonomy-actions'

describe('all CMS mutation boundaries', () => {
  it.each([
    ['save quote', () => saveQuoteAction({})],
    ['change quote state', () => setQuoteStateAction({})],
    ['delete quote', () => deleteQuoteAction('untrusted-id')],
    ...['scholar','source','category','translator','tag'].flatMap(kind => [
      [`save ${kind}`, () => saveTaxonomyAction(kind, {})],
      [`delete ${kind}`, () => deleteTaxonomyAction(kind, 'untrusted-id')],
    ]),
    ['merge tags', () => mergeTagsAction('first', 'second')],
  ] as Array<[string, () => Promise<unknown>]>)('rejects unauthenticated %s before using the privileged database', async (_name, action) => {
    mocks.authorize.mockRejectedValue(new Error('Unauthorized'))
    mocks.client.mockClear()
    await expect(action()).rejects.toThrow('Unauthorized')
    expect(mocks.client).not.toHaveBeenCalled()
  })
})
