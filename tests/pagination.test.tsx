import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Pagination } from '@/components/common/Pagination'

describe('Pagination', () => {
  it('preserves search and filter state in every generated page link', () => {
    render(<Pagination pathname="/quotes" params={{ q: 'knowledge', scholar: 'sample-scholar' }} page={3} totalPages={8} />)
    expect(screen.getByRole('link', { name: 'Previous' }).getAttribute('href')).toBe('/quotes?q=knowledge&scholar=sample-scholar&page=2')
    expect(screen.getByRole('link', { name: 'Next' }).getAttribute('href')).toBe('/quotes?q=knowledge&scholar=sample-scholar&page=4')
    expect(screen.getByRole('link', { name: 'Page 1' }).getAttribute('href')).toBe('/quotes?q=knowledge&scholar=sample-scholar')
  })
})
