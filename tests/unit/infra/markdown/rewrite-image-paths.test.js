import { describe, test, expect } from 'vitest'

import { createMarkdown } from '../../../../src/infra/markdown/markdown.js'
import { rewriteImagePaths } from '../../../../src/infra/markdown/rewrite-image-paths.js'

const DOC_ID = '12345678-1234-5678-1234-567812345678'

const render = (markdown) =>
  createMarkdown()
    .use(rewriteImagePaths({ documentId: DOC_ID }))
    .render(markdown)

describe('#rewriteImagePaths', () => {
  test('rewrites backend image path to BFF asset proxy path', () => {
    expect(render(`![diagram](/guidance/documents/${DOC_ID}/images/img_1.png)`)).toContain(
      `src="/guidance-documents/${DOC_ID}/assets/img_1.png"`
    )
  })

  test('preserves alt text when rewriting', () => {
    expect(render(`![my diagram](/guidance/documents/${DOC_ID}/images/img_1.png)`)).toContain(
      'alt="my diagram"'
    )
  })

  test('leaves images from a different document untouched', () => {
    const otherId = '00000000-0000-0000-0000-000000000000'
    expect(render(`![alt](/guidance/documents/${otherId}/images/img_1.png)`)).toContain(
      `src="/guidance/documents/${otherId}/images/img_1.png"`
    )
  })

  test('leaves external image URLs untouched', () => {
    expect(render('![alt](https://example.com/image.png)')).toContain(
      'src="https://example.com/image.png"'
    )
  })

  test('leaves non-image-path local URLs untouched', () => {
    expect(render('![alt](/public/assets/logo.svg)')).toContain(
      'src="/public/assets/logo.svg"'
    )
  })
})
