import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveQuoteAction } from '@/app/actions/quote-actions'
import { QuoteEditor } from '@/components/admin/QuoteEditor'
import { deferred, options } from './admin-ui-fixtures'

const { replace, refresh } = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }))
vi.mock('@/app/actions/quote-actions', () => ({ saveQuoteAction: vi.fn() }))
beforeEach(() => { vi.clearAllMocks(); vi.mocked(saveQuoteAction).mockReset() })
function submit() { fireEvent.submit(screen.getByLabelText(/English translation/).closest('form')!) }

describe('admin editor request and form lifecycle', () => {
  it('keeps unsaved text on rejection and releases the save lock for retry', async () => {
    vi.mocked(saveQuoteAction).mockRejectedValueOnce(new Error('expired session')).mockResolvedValueOnce({ ok: true, message: 'Draft saved.', id: 'created-id' })
    render(<QuoteEditor options={options} initial={{ english_text: 'Keep this text' }} />)
    submit()
    expect((await screen.findByRole('alert')).textContent).toContain('could not be confirmed')
    expect((screen.getByLabelText(/English translation/) as HTMLTextAreaElement).value).toBe('Keep this text')
    await waitFor(() => expect(screen.getByLabelText(/English translation/).matches(':disabled')).toBe(false))
    expect(refresh).not.toHaveBeenCalled()
    submit()
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin/quotes/created-id/edit'))
  })

  it('blocks duplicate saves and freezes submitted fields until the request finishes', async () => {
    const request = deferred()
    vi.mocked(saveQuoteAction).mockReturnValue(request.promise)
    render(<QuoteEditor options={options} />)
    submit(); submit()
    expect(saveQuoteAction).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText(/English translation/).matches(':disabled')).toBe(true)
    expect(screen.getByRole('combobox', { name: 'Status' }).matches(':disabled')).toBe(true)
    await act(async () => request.resolve({ ok: false, message: 'Try again.' }))
    expect(screen.getByLabelText(/English translation/).matches(':disabled')).toBe(false)
  })

  it('uses the returned id for subsequent saves before navigation completes', async () => {
    vi.mocked(saveQuoteAction).mockResolvedValue({ ok: true, message: 'Saved.', id: 'new-id' })
    render(<QuoteEditor options={options} />)
    submit()
    await screen.findByRole('status')
    await waitFor(() => expect(screen.getByLabelText(/English translation/).matches(':disabled')).toBe(false))
    submit()
    await waitFor(() => expect(saveQuoteAction).toHaveBeenCalledTimes(2))
    expect(vi.mocked(saveQuoteAction).mock.calls[1][0]).toMatchObject({ id: 'new-id' })
    expect(replace).toHaveBeenCalledTimes(1)
  })

  it('resets values, validation and preview when switching records, while preserving edits on same-record refresh', async () => {
    vi.mocked(saveQuoteAction).mockResolvedValue({ ok: false, message: 'Invalid.', fieldErrors: { slug: ['Bad slug'] } })
    const { rerender } = render(<QuoteEditor options={options} initial={{ id: 'first', english_text: 'First' }} />)
    fireEvent.change(screen.getByLabelText(/English translation/), { target: { value: 'Unsaved' } })
    rerender(<QuoteEditor options={options} initial={{ id: 'first', english_text: 'Server copy' }} />)
    expect((screen.getByLabelText(/English translation/) as HTMLTextAreaElement).value).toBe('Unsaved')
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    submit()
    await screen.findByRole('alert')
    rerender(<QuoteEditor options={options} initial={{ id: 'second', english_text: 'Second' }} />)
    expect((screen.getByLabelText(/English translation/) as HTMLTextAreaElement).value).toBe('Second')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('region', { name: 'Quote preview' })).toBeNull()
  })

  it('associates classification errors with their group and focuses the invalid group', async () => {
    vi.mocked(saveQuoteAction).mockResolvedValue({ ok: false, message: 'Review categories.', fieldErrors: { category_ids: ['Remove unavailable categories.'] } })
    render(<QuoteEditor options={options} />)
    submit()
    await screen.findByRole('alert')
    const group = screen.getByRole('group', { name: 'Categories' })
    expect(group.getAttribute('aria-describedby')).toBe('categories-error')
    expect(document.getElementById('categories-error')?.textContent).toContain('Remove unavailable')
    await waitFor(() => expect(document.activeElement).toBe(group))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Knowledge' }))
    expect(group.getAttribute('aria-invalid')).toBe('false')
  })

  it('does not submit through keyboard/form submission when no active scholar exists', () => {
    render(<QuoteEditor options={{ ...options, scholars: [] }} />)
    submit()
    expect(saveQuoteAction).not.toHaveBeenCalled()
  })

  it('keeps focus in the field being corrected when other validation errors remain', async () => {
    vi.mocked(saveQuoteAction).mockResolvedValue({ ok: false, message: 'Review fields.', fieldErrors: { english_text: ['Required.'], slug: ['Required.'] } })
    render(<QuoteEditor options={options} />)
    submit()
    const input = screen.getByLabelText(/English translation/)
    await waitFor(() => expect(document.activeElement).toBe(input))
    fireEvent.change(input, { target: { value: 'Corrected text' } })
    expect(document.activeElement).toBe(input)
    expect(screen.getByLabelText(/Stable URL slug/).getAttribute('aria-invalid')).toBe('true')
  })
})
