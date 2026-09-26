import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteQuoteAction, setQuoteStateAction } from '@/app/actions/quote-actions'
import { AdminQuoteActions } from '@/app/admin/quotes/AdminQuoteActions'
import { deferred, quote } from './admin-ui-fixtures'

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
vi.mock('@/app/actions/quote-actions', () => ({ setQuoteStateAction: vi.fn(), deleteQuoteAction: vi.fn() }))
beforeEach(() => { vi.clearAllMocks(); vi.mocked(setQuoteStateAction).mockReset(); vi.mocked(deleteQuoteAction).mockReset() })
function open() { fireEvent.click(screen.getByRole('button', { name: 'Quote actions' })) }

describe('admin quote actions', () => {
  it('shows a visible rejected-request error and permits retry', async () => {
    vi.mocked(setQuoteStateAction).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ ok: true, message: 'Published.' })
    render(<AdminQuoteActions quote={quote} />)
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('could not be confirmed')
    expect(alert.className).not.toContain('sr-only')
    expect(refresh).not.toHaveBeenCalled()
    await waitFor(() => expect((screen.getByRole('button', { name: 'Publish' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Quote actions' }))
  })

  it('disables all mutations during a pending action', async () => {
    const request = deferred()
    vi.mocked(setQuoteStateAction).mockReturnValue(request.promise)
    render(<AdminQuoteActions quote={quote} />)
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    fireEvent.click(screen.getByRole('button', { name: 'Feature' }))
    expect(setQuoteStateAction).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Delete' }).matches(':disabled')).toBe(true)
    await act(async () => request.resolve({ ok: false, message: 'Permission denied.' }))
    expect(screen.getByRole('alert').textContent).toBe('Permission denied.')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('supports Escape, outside pointer dismissal and tabbing away', () => {
    render(<><AdminQuoteActions quote={quote} /><button>Outside</button></>)
    open()
    const trigger = screen.getByRole('button', { name: 'Quote actions' })
    expect(document.getElementById(trigger.getAttribute('aria-controls')!)).toBeTruthy()
    screen.getByRole('link', { name: 'Edit' }).focus()
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
    open()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }))
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    open()
    screen.getByRole('link', { name: 'Edit' }).focus()
    act(() => screen.getByRole('button', { name: 'Outside' }).focus())
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('requires delete confirmation and handles deletion rejection', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    vi.mocked(deleteQuoteAction).mockRejectedValue(new Error('offline'))
    render(<AdminQuoteActions quote={quote} />)
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(deleteQuoteAction).not.toHaveBeenCalled()
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await screen.findByRole('alert')
    expect(deleteQuoteAction).toHaveBeenCalledWith(quote.id)
    expect(refresh).not.toHaveBeenCalled()
  })

  it.each([
    ['Publish', { id: 'quote-1', status: 'published' }],
    ['Feature', { id: 'quote-1', featured: true }],
    ['Archive', { id: 'quote-1', status: 'archived' }],
  ])('sends the correct %s mutation', async (name, payload) => {
    vi.mocked(setQuoteStateAction).mockResolvedValue({ ok: true, message: 'Updated.' })
    render(<AdminQuoteActions quote={quote} />)
    open()
    fireEvent.click(screen.getByRole('button', { name }))
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    expect(setQuoteStateAction).toHaveBeenCalledWith(payload)
  })
})
