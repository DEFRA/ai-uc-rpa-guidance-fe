import { describe, test, expect } from 'vitest'

import { linkSectionReferences } from '../../../../src/infra/markdown/intra-doc-links.js'

const sections = [
  { number: '1', heading: 'Overview' },
  { number: '1.2', heading: 'Details' },
  { number: '2', heading: 'Next Steps' },
  { number: '10', heading: 'Case resolution and closure' }
]

const link = (markdown) =>
  linkSectionReferences(markdown, { documentId: 'doc-1', sections })

describe('#linkSectionReferences', () => {
  describe('section-number links', () => {
    test('rewrites a bare section-number destination to the section URL', () => {
      expect(link('[see](1.2)')).toBe(
        '[see](/guidance-documents/doc-1/sections/1.2)'
      )
    })

    test('rewrites an anchor-prefixed section reference', () => {
      expect(link('[see](#2)')).toBe('[see](/guidance-documents/doc-1/sections/2)')
    })

    test('rewrites a backend-resolved cross-reference (#10) to its section page', () => {
      // The backend resolves a Word bookmark cross-reference to `#10`; the
      // viewer turns that into the section link with no slug guessing.
      expect(link('[Case resolution and closure](#10)')).toBe(
        '[Case resolution and closure](/guidance-documents/doc-1/sections/10)'
      )
    })

    test('rewrites a destination the converter wrapped in angle brackets', () => {
      // How a converted document writes every link, so this is the form that
      // actually arrives.
      expect(link('A list is in [Annex A](<#10>).')).toBe(
        'A list is in [Annex A](/guidance-documents/doc-1/sections/10).'
      )
    })

    test('leaves references to unknown sections untouched', () => {
      expect(link('[ghost](9.9)')).toBe('[ghost](9.9)')
    })

    test('leaves an unresolved bookmark anchor untouched', () => {
      // Anything the backend could not resolve stays a raw anchor.
      expect(link('[see](#_Some_Bookmark)')).toBe('[see](#_Some_Bookmark)')
    })
  })

  describe('external links', () => {
    test('leaves external links untouched', () => {
      expect(link('[gov](https://gov.uk)')).toBe('[gov](https://gov.uk)')
    })

    test('leaves a query string that would confuse a naive match alone', () => {
      const markdown = '[guide](<https://gov.uk/a?x=1&amp;y=2>)'

      expect(link(markdown)).toBe(markdown)
    })
  })

  test('rewrites every reference in a section, not only the first', () => {
    expect(link('See [one](#1) and [two](#2).')).toBe(
      'See [one](/guidance-documents/doc-1/sections/1) and ' +
        '[two](/guidance-documents/doc-1/sections/2).'
    )
  })
})
