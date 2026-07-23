import { describe, test, expect } from 'vitest'

import { createMarkdown } from '../../../../src/infra/markdown/markdown.js'
import { govukRenderer } from '../../../../src/infra/markdown/govuk-renderer.js'

const render = (markdown) =>
  createMarkdown().use(govukRenderer()).render(markdown)

describe('#govukRenderer', () => {
  test('applies govuk heading classes by depth', () => {
    expect(render('# Title')).toContain('class="govuk-heading-xl"')
    expect(render('## Sub')).toContain('class="govuk-heading-l"')
    expect(render('### Deeper')).toContain('class="govuk-heading-m"')
  })

  test('falls back to the smallest heading class below depth 4', () => {
    expect(render('##### Depth five')).toContain('<h5 class="govuk-heading-s"')
    expect(render('###### Depth six')).toContain('<h6 class="govuk-heading-s"')
  })

  test('adds a slugified id to headings', () => {
    expect(render('## Next Steps')).toContain('<h2 class="govuk-heading-l" id="next-steps">')
  })

  test('slugifies heading text with numbers and punctuation', () => {
    expect(render('### 1.2 Overview')).toContain('id="1-2-overview"')
  })

  test('applies govuk-body to paragraphs', () => {
    expect(render('Some text.')).toContain('<p class="govuk-body">Some text.</p>')
  })

  test('applies govuk-link to internal anchor links, with no target attribute', () => {
    expect(render('[see above](#_Toc123456)')).toContain(
      '<a class="govuk-link" href="#_Toc123456">see above</a>'
    )
  })

  test('opens external links in a new tab with an accessible hint', () => {
    expect(render('[GOV.UK](https://gov.uk)')).toContain(
      '<a class="govuk-link" href="https://gov.uk" target="_blank" rel="noopener noreferrer">GOV.UK<span class="govuk-visually-hidden"> (opens in new tab)</span></a>'
    )
  })

  test('does not open site-relative links in a new tab', () => {
    expect(render('[see section](/guidance-documents/doc-1/sections/1)')).toContain(
      '<a class="govuk-link" href="/guidance-documents/doc-1/sections/1">see section</a>'
    )
  })

  test('renders a link title attribute when one is supplied', () => {
    expect(render('[GOV.UK](https://gov.uk "The title")')).toContain(
      '<a class="govuk-link" href="https://gov.uk" title="The title" target="_blank" rel="noopener noreferrer">'
    )
  })

  test('applies govuk list classes for bullet and numbered lists', () => {
    expect(render('- one\n- two')).toContain(
      '<ul class="govuk-list govuk-list--bullet">'
    )
    expect(render('1. one\n2. two')).toContain(
      '<ol class="govuk-list govuk-list--number">'
    )
  })

  test('renders images with guidance-image class', () => {
    expect(render('![diagram](img.png)')).toContain(
      '<img class="guidance-image" src="img.png" alt="diagram"'
    )
  })

  test('renders images with empty alt when no alt text supplied', () => {
    expect(render('![](img.png)')).toContain('alt=""')
  })

  test('renders tables with govuk-table markup', () => {
    const html = render('| A | B |\n|---|---|\n| 1 | 2 |')
    expect(html).toContain('<table class="govuk-table">')
    expect(html).toContain('<th class="govuk-table__header" scope="col">A</th>')
    expect(html).toContain('<td class="govuk-table__cell">1</td>')
  })
})
