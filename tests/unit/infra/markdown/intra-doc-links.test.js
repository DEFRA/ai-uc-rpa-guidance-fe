import { describe, test, expect } from 'vitest'

import { createMarkdown } from '../../../../src/infra/markdown/markdown.js'
import { rewriteIntraDocLinks } from '../../../../src/infra/markdown/intra-doc-links.js'

const sections = [
  { number: '1', heading: 'Overview' },
  { number: '1.2', heading: 'Details' },
  { number: '2', heading: 'Next Steps' },
  { number: '3.1', heading: 'Specific soil erosion status' }
]

const render = (markdown, opts = {}) =>
  createMarkdown()
    .use(rewriteIntraDocLinks({ documentId: 'doc-1', sections, ...opts }))
    .render(markdown)

describe('#rewriteIntraDocLinks', () => {
  describe('section number links (existing behaviour)', () => {
    test('rewrites a bare section-number href to the section URL', () => {
      expect(render('[see](1.2)')).toContain(
        'href="/guidance-documents/doc-1/sections/1.2"'
      )
    })

    test('rewrites an anchor-prefixed section reference', () => {
      expect(render('[see](#2)')).toContain(
        'href="/guidance-documents/doc-1/sections/2"'
      )
    })

    test('leaves references to unknown sections untouched', () => {
      expect(render('[ghost](9.9)')).toContain('href="9.9"')
    })
  })

  describe('heading slug links', () => {
    test('rewrites a heading-slug fragment to the section page with fragment', () => {
      // heading "Next Steps" in section "2" → rendered id is "2-next-steps"
      expect(render('[see](#next-steps)')).toContain(
        'href="/guidance-documents/doc-1/sections/2#2-next-steps"'
      )
    })

    test('normalises the incoming fragment before matching (Word-style underscores)', () => {
      // _Next_Steps slugifies to "next-steps" → matches "Next Steps"
      expect(render('[see](#_Next_Steps)')).toContain(
        'href="/guidance-documents/doc-1/sections/2#2-next-steps"'
      )
    })

    test('rewrites a match on the current section to a same-page fragment', () => {
      // current section is "2" (Next Steps) → same-page scroll
      expect(render('[see](#next-steps)', { currentSectionNumber: '2' })).toContain(
        'href="#2-next-steps"'
      )
    })

    test('prefix-matches a truncated Word bookmark to the best-matching section', () => {
      // #_Specific_soil_erosion → "specific-soil-erosion" prefix-matches
      // "specific-soil-erosion-status" (section 3.1)
      expect(render('[see](#_Specific_soil_erosion)')).toContain(
        'href="/guidance-documents/doc-1/sections/3.1#3-1-specific-soil-erosion-status"'
      )
    })

    test('leaves unrecognised fragments untouched (same-page sub-heading)', () => {
      expect(render('[see](#some-sub-heading)')).toContain('href="#some-sub-heading"')
    })
  })

  describe('external links', () => {
    test('leaves external links untouched', () => {
      expect(render('[gov](https://gov.uk)')).toContain('href="https://gov.uk"')
    })
  })
})
