import { describe, test, expect } from 'vitest'
import { slugify } from '../../../../src/infra/markdown/slugify.js'

describe('#slugify', () => {
  test('lowercases text', () => {
    expect(slugify('Overview')).toBe('overview')
  })

  test('replaces spaces with hyphens', () => {
    expect(slugify('Next Steps')).toBe('next-steps')
  })

  test('collapses multiple non-alphanumeric characters into one hyphen', () => {
    expect(slugify('Hello -- World')).toBe('hello-world')
  })

  test('strips leading and trailing hyphens', () => {
    expect(slugify('  hello  ')).toBe('hello')
  })

  test('handles empty string', () => {
    expect(slugify('')).toBe('')
  })

  test('handles null/undefined gracefully', () => {
    expect(slugify(null)).toBe('')
    expect(slugify(undefined)).toBe('')
  })

  test('preserves numbers', () => {
    expect(slugify('Section 1.2 Overview')).toBe('section-1-2-overview')
  })
})
