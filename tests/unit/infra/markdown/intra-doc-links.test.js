import { describe, test, expect } from 'vitest'

import { createMarkdown } from '../../../../src/infra/markdown/markdown.js'
import { rewriteIntraDocLinks } from '../../../../src/infra/markdown/intra-doc-links.js'

const sections = [
  { number: '1', heading: 'Overview' },
  { number: '1.2', heading: 'Details' },
  { number: '2', heading: 'Next Steps' },
  { number: '10', heading: 'Case resolution and closure' }
]

const render = (markdown, opts = {}) =>
  createMarkdown()
    .use(rewriteIntraDocLinks({ documentId: 'doc-1', sections, ...opts }))
    .render(markdown)

describe('#rewriteIntraDocLinks', () => {
  describe('section-number links', () => {
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

    test('rewrites a backend-resolved cross-reference (#10) to its section page', () => {
      // The backend resolves a Word bookmark cross-reference to `#10`; the
      // viewer turns that into the section link with no slug guessing.
      expect(render('[Case resolution and closure](#10)')).toContain(
        'href="/guidance-documents/doc-1/sections/10"'
      )
    })

    test('leaves references to unknown sections untouched', () => {
      expect(render('[ghost](9.9)')).toContain('href="9.9"')
    })

    test('leaves an unresolved bookmark anchor untouched', () => {
      // Anything the backend could not resolve stays a raw anchor.
      expect(render('[see](#_Some_Bookmark)')).toContain('href="#_Some_Bookmark"')
    })
  })

  describe('external links', () => {
    test('leaves external links untouched', () => {
      expect(render('[gov](https://gov.uk)')).toContain('href="https://gov.uk"')
    })
  })
})
