import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveQuoteAction } from '@/app/actions/quote-actions'
import { QuoteEditor } from '@/components/admin/QuoteEditor'
import type { QuoteEditorOptions } from '@/data/admin'

const replace = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
}))

vi.mock('@/app/actions/quote-actions', () => ({
  saveQuoteAction: vi.fn(),
}))

const options: QuoteEditorOptions = {
  scholars: [
    { id: 'd9428888-122b-11e1-b85c-61cd3cbb3210', label: 'Imam Ahmad', secondary: 'الإمام أحمد', isArchived: false },
    { id: 'd9428888-122b-11e1-b85c-61cd3cbb3211', label: 'Archived scholar', isArchived: true },
  ],
  sources: [],
  translators: [],
  categories: [],
  tags: [],
}

beforeEach(() => {
  vi.mocked(saveQuoteAction).mockReset()
  replace.mockReset()
  refresh.mockReset()
})

describe('admin quote editor', () => {
  it('uses a named scholar dropdown and disables archived choices', () => {
    render(<QuoteEditor options={options} />)

    expect(screen.getByRole('combobox', { name: /Scholar/ })).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: /Scholar/ })).toBeNull()
    expect(screen.getByRole('option', { name: /Imam Ahmad/ }).textContent).toContain('الإمام أحمد')
    expect((screen.getByRole('option', { name: /Archived scholar/ }) as HTMLOptionElement).disabled).toBe(true)
  })

  it('renders server validation next to the invalid field', async () => {
    vi.mocked(saveQuoteAction).mockResolvedValue({
      ok: false,
      message: 'Review the highlighted fields.',
      fieldErrors: { arabic_text: ['Arabic original is required.'] },
    })
    render(<QuoteEditor options={options} />)

    fireEvent.click(screen.getByRole('button', { name: 'Save quote' }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Review the highlighted fields.'))
    expect(screen.getByText('Arabic original is required.')).toBeTruthy()
    expect(screen.getByLabelText(/Arabic original/).getAttribute('aria-invalid')).toBe('true')
  })
})
