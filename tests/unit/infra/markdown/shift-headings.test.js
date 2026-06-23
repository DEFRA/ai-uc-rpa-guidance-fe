import { describe, test, expect } from 'vitest'

import { createMarkdown } from '../../../../src/infra/markdown/markdown.js'
import { govukRenderer } from '../../../../src/infra/markdown/govuk-renderer.js'
import { shiftHeadings } from '../../../../src/infra/markdown/shift-headings.js'

const render = (markdown, by) =>
  createMarkdown()
    .use(govukRenderer())
    .use(shiftHeadings({ by }))
    .render(markdown)

describe('#shiftHeadings', () => {
  test('promotes a section heading to h1 (heading-xl)', () => {
    // A level-3 section renders its heading at depth 4; shifting by 3 → h1.
    expect(render('#### 1.1.1 Deep', 3)).toContain('<h1 class="govuk-heading-xl">')
  })

  test('preserves relative nesting when shifting', () => {
    const html = render('## 1 Top\n\n### 1.1 Child', 1)
    expect(html).toContain('<h1 class="govuk-heading-xl">1 Top</h1>')
    expect(html).toContain('<h2 class="govuk-heading-l">1.1 Child</h2>')
  })

  test('clamps depth to the valid h1–h6 range', () => {
    expect(render('## Heading', 5)).toContain('<h1')
  })

  test('leaves headings untouched when by is 0', () => {
    expect(render('### Heading', 0)).toContain('<h3 class="govuk-heading-m">')
  })
})
