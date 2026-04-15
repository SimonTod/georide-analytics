import { describe, it, expect } from 'vitest'
import { analyzeGroupTags, type TaggableTrip } from './routeAnalysis'

function tagged(id: number, tag: string): TaggableTrip {
  return { trip_id: id, metadata: { tag: tag as TaggableTrip['metadata'] extends { tag: infer T } | null ? T : never } }
}

function untagged(id: number): TaggableTrip {
  return { trip_id: id, metadata: { tag: null } }
}

function noMeta(id: number): TaggableTrip {
  return { trip_id: id, metadata: null }
}

describe('analyzeGroupTags', () => {
  it('returns all-same when every trip shares the same tag', () => {
    const result = analyzeGroupTags([tagged(1, 'commute'), tagged(2, 'commute'), tagged(3, 'commute')])
    expect(result).toEqual({ kind: 'all-same', tag: 'commute' })
  })

  it('returns all-same for a single tagged trip', () => {
    expect(analyzeGroupTags([tagged(1, 'sport')])).toEqual({ kind: 'all-same', tag: 'sport' })
  })

  it('returns partial when some trips are tagged and some are not', () => {
    const result = analyzeGroupTags([tagged(1, 'commute'), untagged(2), untagged(3)])
    expect(result).toEqual({
      kind: 'partial',
      tag: 'commute',
      taggedCount: 1,
      untaggedIds: [2, 3],
    })
  })

  it('partial: taggedCount reflects the number of tagged trips', () => {
    const result = analyzeGroupTags([tagged(1, 'leisure'), tagged(2, 'leisure'), untagged(3)])
    expect(result.kind).toBe('partial')
    if (result.kind === 'partial') {
      expect(result.taggedCount).toBe(2)
      expect(result.untaggedIds).toEqual([3])
    }
  })

  it('returns none when no trip is tagged', () => {
    const result = analyzeGroupTags([untagged(1), untagged(2)])
    expect(result).toEqual({ kind: 'none', allIds: [1, 2] })
  })

  it('returns none when metadata is null on all trips', () => {
    const result = analyzeGroupTags([noMeta(1), noMeta(2)])
    expect(result).toEqual({ kind: 'none', allIds: [1, 2] })
  })

  it('returns mixed when trips carry different tags', () => {
    const result = analyzeGroupTags([tagged(1, 'commute'), tagged(2, 'leisure'), tagged(3, 'commute')])
    expect(result.kind).toBe('mixed')
    if (result.kind === 'mixed') {
      expect(result.counts).toEqual(
        expect.arrayContaining([
          { tag: 'commute', count: 2 },
          { tag: 'leisure', count: 1 },
        ])
      )
      expect(result.untaggedCount).toBe(0)
    }
  })

  it('mixed: untaggedCount reflects untagged trips in a mixed group', () => {
    const result = analyzeGroupTags([tagged(1, 'commute'), tagged(2, 'leisure'), untagged(3)])
    expect(result.kind).toBe('mixed')
    if (result.kind === 'mixed') {
      expect(result.untaggedCount).toBe(1)
    }
  })
})
