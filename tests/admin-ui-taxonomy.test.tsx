import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteTaxonomyAction, mergeTagsAction, saveTaxonomyAction } from '@/app/actions/taxonomy-actions'
import { TaxonomyManager } from '@/components/admin/TaxonomyManager'
import { deferred, rows } from './admin-ui-fixtures'

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
vi.mock('@/app/actions/taxonomy-actions', () => ({ saveTaxonomyAction: vi.fn(), deleteTaxonomyAction: vi.fn(), mergeTagsAction: vi.fn() }))
beforeEach(() => { vi.clearAllMocks(); vi.mocked(saveTaxonomyAction).mockReset(); vi.mocked(deleteTaxonomyAction).mockReset(); vi.mocked(mergeTagsAction).mockReset() })
function setup() { return render(<TaxonomyManager kind="tag" rows={rows} />) }
function edit(name = 'Knowledge') { fireEvent.click(screen.getByRole('button', { name: 'Edit ' + name })) }
function submit() { fireEvent.submit(screen.getByRole('textbox', { name: 'Tag name *' }).closest('form')!) }
function selectMerge() {
  fireEvent.change(screen.getByRole('combobox', { name: 'Source tag' }), { target: { value: 'tag-1' } })
  fireEvent.change(screen.getByRole('combobox', { name: 'Target tag' }), { target: { value: 'tag-2' } })
}

describe('admin taxonomy forms', () => {
  it('resets unsaved form values between records, new forms and taxonomy kinds', () => {
    const { rerender } = setup()
    edit()
    fireEvent.change(screen.getByRole('textbox', { name: 'Tag name *' }), { target: { value: 'Unsaved' } })
    edit('Patience')
    expect((screen.getByRole('textbox', { name: 'Tag name *' }) as HTMLInputElement).value).toBe('Patience')
    fireEvent.click(screen.getByRole('button', { name: 'New tag' }))
    expect((screen.getByRole('textbox', { name: 'Tag name *' }) as HTMLInputElement).value).toBe('')
    fireEvent.change(screen.getByRole('textbox', { name: 'Tag name *' }), { target: { value: 'New unsaved' } })
    fireEvent.click(screen.getByRole('button', { name: 'New tag' }))
    expect((screen.getByRole('textbox', { name: 'Tag name *' }) as HTMLInputElement).value).toBe('')
    rerender(<TaxonomyManager kind="translator" rows={[]} />)
    expect(screen.queryByRole('form')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Translators')
  })

  it('keeps a manually chosen new-record slug when the name changes', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'New tag' }))
    fireEvent.change(screen.getByLabelText('Tag name *'), { target: { value: 'Name' } })
    expect((screen.getByLabelText('Slug *') as HTMLInputElement).value).toBe('name')
    fireEvent.change(screen.getByLabelText('Slug *'), { target: { value: 'custom' } })
    fireEvent.change(screen.getByLabelText('Tag name *'), { target: { value: 'Different name' } })
    expect((screen.getByLabelText('Slug *') as HTMLInputElement).value).toBe('custom')
  })

  it('announces server validation, associates errors, focuses the field and clears errors on editing or cancellation', async () => {
    vi.mocked(saveTaxonomyAction).mockResolvedValue({ ok: false, message: 'Review fields.', fieldErrors: { slug: ['Choose another slug.'] } })
    setup(); edit(); submit()
    await screen.findByRole('alert')
    const input = screen.getByLabelText('Slug *')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe('slug-error')
    expect(document.getElementById('slug-error')?.textContent).toBe('Choose another slug.')
    await waitFor(() => expect(document.activeElement).toBe(input))
    fireEvent.change(input, { target: { value: 'fixed' } })
    expect(input.getAttribute('aria-invalid')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('preserves values on rejection, blocks duplicate submissions and releases the form for retry', async () => {
    const request = deferred()
    vi.mocked(saveTaxonomyAction).mockReturnValueOnce(request.promise).mockResolvedValueOnce({ ok: true, message: 'Tag updated.' })
    setup(); edit()
    fireEvent.change(screen.getByLabelText('Tag name *'), { target: { value: 'Changed' } })
    submit(); submit()
    expect(saveTaxonomyAction).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Tag name *').matches(':disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Cancel' }).matches(':disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Edit Patience' }).matches(':disabled')).toBe(true)
    await act(async () => request.reject(new Error('session expired')))
    expect(screen.getByRole('alert').textContent).toContain('could not be confirmed')
    expect((screen.getByLabelText('Tag name *') as HTMLInputElement).value).toBe('Changed')
    expect(refresh).not.toHaveBeenCalled()
    submit()
    await waitFor(() => expect(screen.queryByRole('form')).toBeNull())
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('prevents archive, delete and merge mutations from making an open edit form stale', () => {
    setup(); edit()
    expect(screen.getByRole('button', { name: 'Archive Knowledge' }).matches(':disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Delete Knowledge' }).matches(':disabled')).toBe(true)
    expect(screen.getByRole('combobox', { name: 'Source tag' }).matches(':disabled')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Archive Knowledge' }).matches(':disabled')).toBe(false)
  })

  it('retains merge selections after failure and clears them on successful merge before refresh', async () => {
    vi.mocked(mergeTagsAction).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ok: true, message: 'Merged.' })
    setup(); selectMerge()
    fireEvent.click(screen.getByRole('button', { name: 'Merge tags' }))
    await screen.findByRole('alert')
    expect((screen.getByRole('combobox', { name: 'Source tag' }) as HTMLSelectElement).value).toBe('tag-1')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Merge tags' }).matches(':disabled')).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Merge tags' }))
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    expect((screen.getByRole('combobox', { name: 'Source tag' }) as HTMLSelectElement).value).toBe('')
    expect(screen.getByRole('button', { name: 'Merge tags' }).matches(':disabled')).toBe(true)
  })

  it('clears obsolete merge selections when refreshed rows no longer include the source', () => {
    const { rerender } = setup(); selectMerge()
    rerender(<TaxonomyManager kind="tag" rows={rows.slice(1)} />)
    expect((screen.getByRole('combobox', { name: 'Source tag' }) as HTMLSelectElement).value).toBe('')
    expect(screen.getByRole('button', { name: 'Merge tags' }).matches(':disabled')).toBe(true)
  })

  it('handles rejected archive and delete actions without refreshing', async () => {
    vi.mocked(saveTaxonomyAction).mockRejectedValue(new Error('offline'))
    vi.mocked(deleteTaxonomyAction).mockRejectedValue(new Error('offline'))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Archive Knowledge' }))
    await screen.findByRole('alert')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete Knowledge' }).matches(':disabled')).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Knowledge' }))
    expect(deleteTaxonomyAction).not.toHaveBeenCalled()
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Delete Knowledge' }))
    await screen.findByRole('alert')
    expect(deleteTaxonomyAction).toHaveBeenCalledWith('tag', 'tag-1')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('names and describes parent category errors', async () => {
    vi.mocked(saveTaxonomyAction).mockResolvedValue({ ok: false, message: 'Invalid parent.', fieldErrors: { parent_id: ['Cycle detected.'] } })
    render(<TaxonomyManager kind="category" rows={rows} categoryOptions={rows.map(({ id, name }) => ({ id, name }))} />)
    edit()
    fireEvent.submit(screen.getByRole('form', { name: 'Edit category' }))
    await screen.findByRole('alert')
    expect(screen.getByLabelText('Parent category').getAttribute('aria-describedby')).toBe('parent_id-error')
    expect(document.getElementById('parent_id-error')?.textContent).toBe('Cycle detected.')
  })

  it('keeps focus while correcting one of several invalid fields', async () => {
    vi.mocked(saveTaxonomyAction).mockResolvedValue({ ok: false, message: 'Review fields.', fieldErrors: { name: ['Invalid name.'], slug: ['Invalid slug.'] } })
    setup(); edit(); submit()
    await screen.findByRole('alert')
    const input = screen.getByLabelText('Tag name *')
    await waitFor(() => expect(document.activeElement).toBe(input))
    fireEvent.change(input, { target: { value: 'Corrected name' } })
    expect(document.activeElement).toBe(input)
    expect(screen.getByLabelText('Slug *').getAttribute('aria-invalid')).toBe('true')
  })
})
