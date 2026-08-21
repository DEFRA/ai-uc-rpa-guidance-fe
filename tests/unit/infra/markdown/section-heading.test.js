import { describe, test, expect } from 'vitest'

import {
  splitDocumentMarkdown,
  splitSectionMarkdown
} from '../../../../src/infra/markdown/section-heading.js'

describe('#splitSectionMarkdown', () => {
  test('Should separate the generated heading line from the body', () => {
    const result = splitSectionMarkdown('## 1 Overview\n\nIntro text.\n', '1')

    expect(result).toEqual({ heading: 'Overview', body: 'Intro text.' })
  })

  test('Should strip the section number prefix from the heading', () => {
    const result = splitSectionMarkdown('#### 1.2.3 Deep detail\n\nText.\n', '1.2.3')

    expect(result.heading).toBe('Deep detail')
  })

  test('Should handle any heading depth', () => {
    const result = splitSectionMarkdown('###### 1.2.3.4.5 Deepest\n\nText.\n', '1.2.3.4.5')

    expect(result.heading).toBe('Deepest')
  })

  test('Should keep hashes that appear inside the heading text', () => {
    const result = splitSectionMarkdown('## 7 Rule #7 applies\n\nText.\n', '7')

    expect(result.heading).toBe('Rule #7 applies')
  })

  test('Should keep a heading that legitimately begins with its section number', () => {
    // Section 7 headed "7 day rule" is stored as "## 7 7 day rule"; exactly one
    // number prefix is removed, so the real heading survives.
    const result = splitSectionMarkdown('## 7 7 day rule\n\nText.\n', '7')

    expect(result.heading).toBe('7 day rule')
  })

  test('Should return an empty body for a heading-only section', () => {
    const result = splitSectionMarkdown('## 1 Overview\n', '1')

    expect(result).toEqual({ heading: 'Overview', body: '' })
  })

  test('Should preserve blank lines and structure within the body', () => {
    const markdown = '## 1 Overview\n\nFirst para.\n\n- item one\n- item two\n\nLast para.\n'

    expect(splitSectionMarkdown(markdown, '1').body).toBe(
      'First para.\n\n- item one\n- item two\n\nLast para.'
    )
  })

  test('Should not strip a number that is not this section', () => {
    // Defensive: if the stored file disagrees with the manifest, show it as-is
    // rather than silently removing a token that may be real heading text.
    const result = splitSectionMarkdown('## 2 9 lives\n\nText.\n', '2')

    expect(result.heading).toBe('9 lives')
  })

  test('Should normalise Windows line endings', () => {
    const result = splitSectionMarkdown('## 1 Overview\r\n\r\nIntro text.\r\n', '1')

    expect(result).toEqual({ heading: 'Overview', body: 'Intro text.' })
  })

  test('Should preserve a trailing non-breaking space in the body', () => {
    // U+00A0 is content, not layout, and String.trim() strips it. Losing it here
    // would silently drop a character on every round trip through the editor.
    const result = splitSectionMarkdown('## 1 Overview\n\nText. \n', '1')

    expect(result.body).toBe('Text. ')
  })

  test('Should preserve a non-breaking space in the heading', () => {
    const result = splitSectionMarkdown('## 1 Wheat harvest\n\nText.\n', '1')

    expect(result.heading).toBe('Wheat harvest')
  })

  test('Should report a null heading when there is no heading line', () => {
    const result = splitSectionMarkdown('Just body text.\n', '1')

    expect(result).toEqual({ heading: null, body: 'Just body text.' })
  })

  test('Should report a null heading for empty markdown', () => {
    expect(splitSectionMarkdown('', '1')).toEqual({ heading: null, body: '' })
  })

  test('Should tolerate a heading line with no body separator', () => {
    const result = splitSectionMarkdown('## 1 Overview\nText immediately after.\n', '1')

    expect(result).toEqual({ heading: 'Overview', body: 'Text immediately after.' })
  })

  test('Should return an empty heading when the line has only a number', () => {
    const result = splitSectionMarkdown('## 1\n\nText.\n', '1')

    expect(result.heading).toBe('')
  })
})

describe('#splitDocumentMarkdown', () => {
  test('Should separate the title line from the body', () => {
    const result = splitDocumentMarkdown('# Wheat guidance\n\n## 1 Overview\n\nIntro.\n')

    expect(result).toEqual({
      title: 'Wheat guidance',
      body: '## 1 Overview\n\nIntro.'
    })
  })

  test('Should keep a leading number in the title', () => {
    const result = splitDocumentMarkdown('# 2024 payment rates\n\nBody.\n')

    expect(result.title).toBe('2024 payment rates')
  })

  test('Should report a null title when there is no heading line', () => {
    const result = splitDocumentMarkdown('Just body text.\n')

    expect(result).toEqual({ title: null, body: 'Just body text.' })
  })

  test('Should report a null title for empty markdown', () => {
    expect(splitDocumentMarkdown('')).toEqual({ title: null, body: '' })
  })

  test('Should normalise Windows line endings', () => {
    const result = splitDocumentMarkdown('# Title\r\n\r\n## 1 Overview\r\n')

    expect(result).toEqual({ title: 'Title', body: '## 1 Overview' })
  })

  test('Should preserve a non-breaking space in the title', () => {
    const result = splitDocumentMarkdown('# Rural\u00a0payments\n\nBody.\n')

    expect(result.title).toBe('Rural\u00a0payments')
  })
})
