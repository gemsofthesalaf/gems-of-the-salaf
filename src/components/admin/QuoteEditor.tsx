'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Save } from 'lucide-react'
import { saveQuoteAction, type ActionResult } from '@/app/actions/quote-actions'
import type { EditorOption, QuoteEditorOptions } from '@/data/admin'
import type { QuoteEditorInput } from '@/lib/validation'
import { slugify } from '@/lib/validation'

type EditorValue = Omit<QuoteEditorInput, 'id'> & { id?: string | null }
type FieldErrors = NonNullable<ActionResult['fieldErrors']>
type NullableTextKey = 'book' | 'volume' | 'page' | 'chapter' | 'edition' | 'external_reference' | 'admin_notes'

export function QuoteEditor({ initial, options }: { initial?: Partial<EditorValue>; options: QuoteEditorOptions }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [preview, setPreview] = useState(false)
  const [value, setValue] = useState<EditorValue>({
    id: initial?.id ?? null,
    slug: initial?.slug ?? '',
    arabic_text: initial?.arabic_text ?? '',
    english_text: initial?.english_text ?? '',
    scholar_id: initial?.scholar_id ?? '',
    source_id: initial?.source_id ?? null,
    translator_id: initial?.translator_id ?? null,
    status: initial?.status ?? 'draft',
    featured: initial?.featured ?? false,
    book: initial?.book ?? null,
    volume: initial?.volume ?? null,
    page: initial?.page ?? null,
    chapter: initial?.chapter ?? null,
    edition: initial?.edition ?? null,
    external_reference: initial?.external_reference ?? null,
    admin_notes: initial?.admin_notes ?? null,
    category_ids: initial?.category_ids ?? [],
    tag_ids: initial?.tag_ids ?? [],
  })

  const scholar = useMemo(
    () => options.scholars.find((item) => item.id === value.scholar_id),
    [options.scholars, value.scholar_id],
  )
  const hasActiveScholar = options.scholars.some((item) => !item.isArchived)

  function clearFieldError(key: keyof EditorValue) {
    setFieldErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function set<K extends keyof EditorValue>(key: K, next: EditorValue[K]) {
    setValue((current) => ({ ...current, [key]: next }))
    clearFieldError(key)
  }

  function setNullableText(key: NullableTextKey, next: string) {
    set(key, next || null)
  }

  function toggle(key: 'category_ids' | 'tag_ids', id: string) {
    set(key, value[key].includes(id) ? value[key].filter((item) => item !== id) : [...value[key], id])
  }

  function errorFor(key: keyof EditorValue): string | undefined {
    return fieldErrors[key]?.[0]
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setFieldErrors({})
    startTransition(async () => {
      const result = await saveQuoteAction(value)
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {})
        setMessage({ kind: 'error', text: result.message })
        return
      }
      setMessage({ kind: 'success', text: result.message })
      if (!value.id && result.id) router.replace(`/admin/quotes/${result.id}/edit`)
      router.refresh()
    })
  }

  return (
    <form className="editor-layout" onSubmit={submit} noValidate>
      <div className="editor-main">
        {message && (
          <div className={`form-alert form-alert-${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>
            {message.text}
          </div>
        )}
        {!hasActiveScholar && (
          <div className="form-alert form-alert-error" role="alert">
            Create or restore an active scholar before saving a quote.{' '}
            <Link className="text-link" href="/admin/scholars">Manage scholars</Link>
          </div>
        )}

        <section className="admin-card form-section">
          <div>
            <h2>Quotation</h2>
            <p>Preserve the supplied wording exactly. Do not infer missing text.</p>
          </div>
          <label className="field-label" htmlFor="arabic_text">
            Arabic original <span aria-hidden="true">*</span>
          </label>
          <textarea
            id="arabic_text"
            className="field-control field-textarea arabic-input"
            dir="rtl"
            value={value.arabic_text}
            onChange={(event) => set('arabic_text', event.target.value)}
            required
            maxLength={20_000}
            aria-invalid={Boolean(errorFor('arabic_text'))}
            aria-describedby={errorFor('arabic_text') ? 'arabic_text-error' : undefined}
          />
          <FieldError id="arabic_text-error" message={errorFor('arabic_text')} />

          <label className="field-label" htmlFor="english_text">
            English translation <span aria-hidden="true">*</span>
          </label>
          <textarea
            id="english_text"
            className="field-control field-textarea"
            value={value.english_text}
            onChange={(event) => set('english_text', event.target.value)}
            required
            maxLength={20_000}
            aria-invalid={Boolean(errorFor('english_text'))}
            aria-describedby={errorFor('english_text') ? 'english_text-error' : undefined}
          />
          <FieldError id="english_text-error" message={errorFor('english_text')} />
        </section>

        <section className="admin-card form-section">
          <div>
            <h2>Attribution and citation</h2>
            <p>Only enter metadata verified against the source.</p>
          </div>
          <div className="form-grid-two">
            <FieldSelect
              id="scholar_id"
              label="Scholar *"
              value={value.scholar_id}
              options={options.scholars}
              onChange={(next) => set('scholar_id', next)}
              required
              emptyLabel="Select a scholar"
              error={errorFor('scholar_id')}
            />
            <FieldSelect
              id="source_id"
              label="Source"
              value={value.source_id ?? ''}
              options={options.sources}
              onChange={(next) => set('source_id', next || null)}
              emptyLabel="No source supplied"
              error={errorFor('source_id')}
            />
          </div>
          <div className="form-grid-two">
            <FieldSelect
              id="translator_id"
              label="Translator"
              value={value.translator_id ?? ''}
              options={options.translators}
              onChange={(next) => set('translator_id', next || null)}
              emptyLabel="No translator supplied"
              error={errorFor('translator_id')}
            />
            <TextField
              id="book"
              label="Book / work detail"
              value={value.book}
              onChange={(next) => setNullableText('book', next)}
              error={errorFor('book')}
            />
          </div>
          <div className="form-grid-three">
            <TextField id="volume" label="Volume" value={value.volume} onChange={(next) => setNullableText('volume', next)} error={errorFor('volume')} />
            <TextField id="page" label="Page" value={value.page} onChange={(next) => setNullableText('page', next)} error={errorFor('page')} />
            <TextField id="chapter" label="Chapter" value={value.chapter} onChange={(next) => setNullableText('chapter', next)} error={errorFor('chapter')} />
          </div>
          <TextField id="edition" label="Edition" value={value.edition} onChange={(next) => setNullableText('edition', next)} error={errorFor('edition')} />
          <TextField
            id="external_reference"
            label="External reference URL"
            value={value.external_reference}
            onChange={(next) => setNullableText('external_reference', next)}
            type="url"
            error={errorFor('external_reference')}
          />
        </section>

        <section className="admin-card form-section">
          <div>
            <h2>Classification</h2>
            <p>Categories and tags are relational and can be changed without rewriting the quote.</p>
          </div>
          <ChoiceGrid
            label="Categories"
            options={options.categories}
            selected={value.category_ids}
            onToggle={(id) => toggle('category_ids', id)}
            error={errorFor('category_ids')}
          />
          <ChoiceGrid
            label="Tags"
            options={options.tags}
            selected={value.tag_ids}
            onToggle={(id) => toggle('tag_ids', id)}
            error={errorFor('tag_ids')}
          />
        </section>

        <section className="admin-card form-section">
          <label className="field-label" htmlFor="admin_notes">Private administrative notes</label>
          <textarea
            id="admin_notes"
            className="field-control field-textarea"
            value={value.admin_notes ?? ''}
            onChange={(event) => setNullableText('admin_notes', event.target.value)}
            maxLength={10_000}
            aria-invalid={Boolean(errorFor('admin_notes'))}
            aria-describedby={errorFor('admin_notes') ? 'admin_notes-error' : 'admin_notes-help'}
          />
          <FieldError id="admin_notes-error" message={errorFor('admin_notes')} />
          <p className="field-help" id="admin_notes-help">Never shown on public pages.</p>
        </section>
      </div>

      <aside className="editor-sidebar">
        <section className="admin-card form-section">
          <h2>Publishing</h2>
          <label className="field-label" htmlFor="status">Status</label>
          <select
            id="status"
            className="field-control"
            value={value.status}
            onChange={(event) => set('status', event.target.value as EditorValue['status'])}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <label className="check-row">
            <input type="checkbox" checked={value.featured} onChange={(event) => set('featured', event.target.checked)} />
            <span>Feature this quote</span>
          </label>

          <label className="field-label" htmlFor="slug">Stable URL slug *</label>
          <div className="slug-row">
            <input
              id="slug"
              className="field-control"
              value={value.slug}
              onChange={(event) => set('slug', event.target.value)}
              required
              aria-invalid={Boolean(errorFor('slug'))}
              aria-describedby={errorFor('slug') ? 'slug-error' : undefined}
            />
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={() => set('slug', slugify(value.english_text).slice(0, 96))}
            >
              Generate
            </button>
          </div>
          <FieldError id="slug-error" message={errorFor('slug')} />

          <button className="button button-primary" type="submit" disabled={pending || !hasActiveScholar}>
            <Save aria-hidden="true" />
            {pending ? 'Saving…' : 'Save quote'}
          </button>
          <button className="button button-secondary" type="button" onClick={() => setPreview((current) => !current)}>
            <Eye aria-hidden="true" />
            {preview ? 'Hide preview' : 'Preview'}
          </button>
          {value.status === 'published' && value.slug && (
            <Link className="text-link" href={`/quotes/${value.slug}`} target="_blank">Open public page</Link>
          )}
        </section>

        {preview && (
          <section className="editor-preview" aria-label="Quote preview">
            {value.arabic_text && <p className="quote-arabic" lang="ar" dir="rtl">{value.arabic_text}</p>}
            <blockquote>{value.english_text || 'English translation preview'}</blockquote>
            <p>— {scholar?.label || 'Select a scholar'}</p>
          </section>
        )}
      </aside>
    </form>
  )
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  error,
}: {
  id: string
  label: string
  value: string | null
  onChange: (value: string) => void
  type?: string
  error?: string
}) {
  const errorId = `${id}-error`
  return (
    <div className="field-group">
      <label className="field-label" htmlFor={id}>{label}</label>
      <input
        className="field-control"
        id={id}
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      <FieldError id={errorId} message={error} />
    </div>
  )
}

function FieldSelect({
  id,
  label,
  value,
  options,
  onChange,
  emptyLabel,
  required,
  error,
}: {
  id: string
  label: string
  value: string
  options: EditorOption[]
  onChange: (value: string) => void
  emptyLabel: string
  required?: boolean
  error?: string
}) {
  const errorId = `${id}-error`
  return (
    <div className="field-group">
      <label className="field-label" htmlFor={id}>{label}</label>
      <select
        className="field-control"
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option
            key={option.id}
            value={option.id}
            disabled={option.isArchived && option.id !== value}
          >
            {option.label}{option.secondary ? ` — ${option.secondary}` : ''}{option.isArchived ? ' (archived)' : ''}
          </option>
        ))}
      </select>
      <FieldError id={errorId} message={error} />
    </div>
  )
}

function ChoiceGrid({
  label,
  options,
  selected,
  onToggle,
  error,
}: {
  label: string
  options: EditorOption[]
  selected: string[]
  onToggle: (id: string) => void
  error?: string
}) {
  return (
    <fieldset className="choice-fieldset" aria-invalid={Boolean(error)}>
      <legend>{label}</legend>
      <div className="choice-grid">
        {options.length ? options.map((option) => {
          const checked = selected.includes(option.id)
          return (
            <label key={option.id} className="check-row">
              <input
                type="checkbox"
                checked={checked}
                disabled={option.isArchived && !checked}
                onChange={() => onToggle(option.id)}
              />
              <span>{option.label}{option.isArchived ? ' (archived)' : ''}</span>
            </label>
          )
        }) : <p className="empty-copy">No {label.toLowerCase()} are available.</p>}
      </div>
      <FieldError id={`${label.toLowerCase()}-error`} message={error} />
    </fieldset>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return <p className="field-error" id={id}>{message}</p>
}
