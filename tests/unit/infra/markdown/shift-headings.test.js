import { describe, test, expect } from 'vitest'

import { shiftHeadings } from '../../../../src/infra/markdown/shift-headings.js'

describe('#shiftHeadings', () => {
  test('promotes a section heading to the page heading', () => {
    // A level-3 section renders its heading at depth 4; shifting by 3 → h1.
    expect(shiftHeadings('#### 1.1.1 Deep', 3)).toBe('# 1.1.1 Deep')
  })

  test('preserves relative nesting when shifting', () => {
    expect(shiftHeadings('## 1 Top\n\n### 1.1 Child', 1)).toBe(
      '# 1 Top\n\n## 1.1 Child'
    )
  })

  test('clamps depth to the valid h1–h6 range', () => {
    expect(shiftHeadings('## Heading', 5)).toBe('# Heading')
    expect(shiftHeadings('## Heading', -6)).toBe('###### Heading')
  })

  test('leaves headings untouched when by is 0', () => {
    expect(shiftHeadings('### Heading', 0)).toBe('### Heading')
  })

  test('leaves the rest of the document alone', () => {
    const markdown = '## Heading\n\nA #1 case, and a | table | row |\n'

    expect(shiftHeadings(markdown, 1)).toBe(
      '# Heading\n\nA #1 case, and a | table | row |\n'
    )
  })

  test('leaves a hash inside fenced code as the code it is', () => {
    const markdown = '## Heading\n\n```\n## not a heading\n```\n\n### After'

    expect(shiftHeadings(markdown, 1)).toBe(
      '# Heading\n\n```\n## not a heading\n```\n\n## After'
    )
  })
})
