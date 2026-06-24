import { describe, test, expect } from 'vitest'

import { createMarkdown } from '../../../../src/infra/markdown/markdown.js'
import { rewriteIntraDocLinks } from '../../../../src/infra/markdown/intra-doc-links.js'

const sections = [{ number: '1' }, { number: '1.2' }, { number: '2' }]

const render = (markdown) =>
  createMarkdown()
    .use(rewriteIntraDocLinks({ documentId: 'doc-1', sections }))
    .render(markdown)

describe('#rewriteIntraDocLinks', () => {
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

  test('leaves external links untouched', () => {
    expect(render('[gov](https://gov.uk)')).toContain('href="https://gov.uk"')
  })

  test('leaves references to unknown sections untouched', () => {
    expect(render('[ghost](9.9)')).toContain('href="9.9"')
  })
})
