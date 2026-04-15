import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TagBadge, { TAG_LABELS, TAG_COLORS } from './TagBadge'
import type { TripTag } from '../../types/georide'

/** jsdom normalizes hex colors to rgb() when reading style properties */
function hexToRgb(hex: string): string {
  const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((x) =>
    parseInt(x, 16)
  )
  return `rgb(${r}, ${g}, ${b})`
}

const ALL_TAGS: TripTag[] = ['commute', 'leisure', 'sport', 'track', 'other']

describe('TAG_LABELS', () => {
  it('has exactly 5 entries', () => {
    expect(Object.keys(TAG_LABELS)).toHaveLength(5)
  })

  it('has a non-empty label for every tag', () => {
    for (const tag of ALL_TAGS) {
      expect(TAG_LABELS[tag]).toBeTruthy()
    }
  })
})

describe('TAG_COLORS', () => {
  it('has exactly 5 entries', () => {
    expect(Object.keys(TAG_COLORS)).toHaveLength(5)
  })

  it('every color is a valid hex code', () => {
    for (const tag of ALL_TAGS) {
      expect(TAG_COLORS[tag]).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})

describe('TagBadge', () => {
  it.each(ALL_TAGS)('renders the correct label for tag "%s"', (tag) => {
    const { getByText } = render(<TagBadge tag={tag} />)
    expect(getByText(TAG_LABELS[tag])).toBeInTheDocument()
  })

  it('applies the background color from TAG_COLORS as an inline style', () => {
    const { container } = render(<TagBadge tag="commute" />)
    const span = container.firstChild as HTMLElement
    // jsdom normalizes '#3b82f6' → 'rgb(59, 130, 246)'
    expect(span.style.background).toBe(hexToRgb(TAG_COLORS['commute']))
  })

  it('renders without error for all tags', () => {
    for (const tag of ALL_TAGS) {
      expect(() => render(<TagBadge tag={tag} />)).not.toThrow()
    }
  })
})
