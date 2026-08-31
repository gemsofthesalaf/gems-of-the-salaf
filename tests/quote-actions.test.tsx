import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuoteActions } from '@/components/quotes/QuoteActions'

const writeText = vi.fn(async () => undefined)

beforeEach(() => {
  writeText.mockClear()
  Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText } })
  Object.defineProperty(window.navigator, 'share', { configurable: true, value: undefined })
})

describe('quote sharing controls', () => {
  it('copies the exact Arabic and English payload', async () => {
    render(<QuoteActions arabicText="العلم نور" englishText="Knowledge is light." canonicalUrl="https://gemsofthesalaf.com/quotes/example" />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy both' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('العلم نور\n\nKnowledge is light.'))
  })

  it('uses URL-copy fallback when native share is unavailable', async () => {
    render(<QuoteActions arabicText={null} englishText="Verified text." canonicalUrl="https://gemsofthesalaf.com/quotes/verified" />)
    expect(screen.queryByRole('button', { name: 'Copy Arabic' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://gemsofthesalaf.com/quotes/verified'))
  })
})
