import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuoteActions } from '@/components/quotes/QuoteActions'

const writeText = vi.fn(async () => undefined)

beforeEach(() => {
  writeText.mockClear()
  Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText } })
  Object.defineProperty(window.navigator, 'share', { configurable: true, value: undefined })
  Object.defineProperty(document, 'execCommand', { configurable: true, value: undefined })
})

describe('quote sharing controls', () => {
  it('copies the exact Arabic and English payload', async () => {
    render(<QuoteActions arabicText="العلم نور" englishText="Knowledge is light." canonicalUrl="https://gemsofthesalaf.com/quotes/example" />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy both' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('العلم نور\n\nKnowledge is light.'))
  })

  it('falls back to the selection-based copy when clipboard permission is denied', async () => {
    writeText.mockRejectedValueOnce(new Error('Clipboard permission denied'))
    const execCommand = vi.fn(() => true)
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand })
    render(<QuoteActions arabicText={null} englishText="Verified text." canonicalUrl="https://gemsofthesalaf.com/quotes/verified" />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy English' }))
    await waitFor(() => expect(execCommand).toHaveBeenCalledWith('copy'))
    expect((await screen.findByRole('status')).textContent).toBe('English copied')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('uses URL-copy fallback when native share is unavailable', async () => {
    render(<QuoteActions arabicText={null} englishText="Verified text." canonicalUrl="https://gemsofthesalaf.com/quotes/verified" />)
    expect(screen.queryByRole('button', { name: 'Copy Arabic' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://gemsofthesalaf.com/quotes/verified'))
    expect((await screen.findByRole('status')).textContent).toBe('Link copied')
  })

  it('uses native share with the quote text and canonical URL when available', async () => {
    const share = vi.fn(async () => undefined)
    Object.defineProperty(window.navigator, 'share', { configurable: true, value: share })
    render(<QuoteActions arabicText="العلم نور" englishText="Knowledge is light." canonicalUrl="https://gemsofthesalaf.com/quotes/example" />)
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    await waitFor(() => expect(share).toHaveBeenCalledWith({
      title: 'Gems of the Salaf',
      text: 'Knowledge is light.',
      url: 'https://gemsofthesalaf.com/quotes/example',
    }))
    expect((await screen.findByRole('status')).textContent).toBe('Share sheet opened')
  })

  it('copies the link when native sharing fails', async () => {
    const share = vi.fn(async () => { throw new Error('Share failed') })
    Object.defineProperty(window.navigator, 'share', { configurable: true, value: share })
    render(<QuoteActions arabicText={null} englishText="Verified text." canonicalUrl="https://gemsofthesalaf.com/quotes/verified" />)
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://gemsofthesalaf.com/quotes/verified'))
    expect((await screen.findByRole('status')).textContent).toBe('Sharing failed; link copied instead')
  })

  it('reports a useful error when neither sharing nor clipboard fallback works', async () => {
    writeText.mockRejectedValueOnce(new Error('Clipboard unavailable'))
    render(<QuoteActions arabicText={null} englishText="Verified text." canonicalUrl="https://gemsofthesalaf.com/quotes/verified" />)
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    expect((await screen.findByRole('status')).textContent).toBe('Sharing is unavailable and the link could not be copied. Copy the page address manually.')
  })
})
