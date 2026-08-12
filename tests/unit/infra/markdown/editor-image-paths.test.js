import { describe, test, expect } from 'vitest'

import {
  toBrowserImagePaths,
  toStoredImagePaths
} from '../../../../src/infra/markdown/editor-image-paths.js'

const DOC = 'doc-1'
const STORED = '![Diagram](/guidance/documents/doc-1/images/img_1.png)'
const BROWSER = '![Diagram](/guidance-documents/doc-1/assets/img_1.png)'

describe('#toBrowserImagePaths', () => {
  test('Should point this document\'s images at the proxy route', () => {
    expect(toBrowserImagePaths(STORED, DOC)).toBe(BROWSER)
  })

  test('Should map every image in the markdown', () => {
    const stored = [
      '![a](/guidance/documents/doc-1/images/img_1.png)',
      '![b](/guidance/documents/doc-1/images/img_2.png)'
    ].join('\n\n')

    const result = toBrowserImagePaths(stored, DOC)

    expect(result).toContain('/guidance-documents/doc-1/assets/img_1.png')
    expect(result).toContain('/guidance-documents/doc-1/assets/img_2.png')
    expect(result).not.toContain('/guidance/documents/doc-1/images/')
  })

  test('Should also map raw HTML img tags', () => {
    const stored = '<img src="/guidance/documents/doc-1/images/img_1.png" alt="a">'

    expect(toBrowserImagePaths(stored, DOC)).toBe(
      '<img src="/guidance-documents/doc-1/assets/img_1.png" alt="a">'
    )
  })

  test('Should leave another document\'s images untouched', () => {
    const stored = '![a](/guidance/documents/other-doc/images/img_1.png)'

    expect(toBrowserImagePaths(stored, DOC)).toBe(stored)
  })

  test('Should leave external images untouched', () => {
    const stored = '![a](https://example.test/img.png)'

    expect(toBrowserImagePaths(stored, DOC)).toBe(stored)
  })

  test('Should leave markdown with no images unchanged', () => {
    expect(toBrowserImagePaths('Just text.', DOC)).toBe('Just text.')
  })
})

describe('#toStoredImagePaths', () => {
  test('Should restore the backend path', () => {
    expect(toStoredImagePaths(BROWSER, DOC)).toBe(STORED)
  })

  test('Should leave another document\'s proxy paths untouched', () => {
    const browser = '![a](/guidance-documents/other-doc/assets/img_1.png)'

    expect(toStoredImagePaths(browser, DOC)).toBe(browser)
  })

  test('Should not rewrite section links that share the route prefix', () => {
    // /guidance-documents/{id}/sections/... must survive: only /assets/ maps back.
    const browser = '[Section 1.2](/guidance-documents/doc-1/sections/1.2)'

    expect(toStoredImagePaths(browser, DOC)).toBe(browser)
  })
})

describe('round trip', () => {
  test('Should be lossless for stored markdown', () => {
    expect(toStoredImagePaths(toBrowserImagePaths(STORED, DOC), DOC)).toBe(STORED)
  })

  test('Should be lossless for markdown mixing image types and links', () => {
    const stored = [
      '![mine](/guidance/documents/doc-1/images/img_1.png)',
      '![theirs](/guidance/documents/other/images/img_9.png)',
      '![remote](https://example.test/x.png)',
      '[link](/guidance-documents/doc-1/sections/2)',
      '<img src="/guidance/documents/doc-1/images/img_2.png" alt="raw">'
    ].join('\n\n')

    expect(toStoredImagePaths(toBrowserImagePaths(stored, DOC), DOC)).toBe(stored)
  })

  test('Should be idempotent when applied twice', () => {
    const once = toBrowserImagePaths(STORED, DOC)

    expect(toBrowserImagePaths(once, DOC)).toBe(once)
  })
})
