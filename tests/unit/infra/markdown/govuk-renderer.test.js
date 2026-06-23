import { describe, test, expect } from 'vitest'

import { createMarkdown } from '../../../../src/infra/markdown/markdown.js'
import { govukRenderer } from '../../../../src/infra/markdown/govuk-renderer.js'

const render = (markdown) =>
  createMarkdown().use(govukRenderer()).render(markdown)

describe('#govukRenderer', () => {
  test('applies govuk heading classes by depth', () => {
    expect(render('# Title')).toContain('<h1 class="govuk-heading-xl">')
    expect(render('## Sub')).toContain('<h2 class="govuk-heading-l">')
    expect(render('### Deeper')).toContain('<h3 class="govuk-heading-m">')
  })

  test('applies govuk-body to paragraphs', () => {
    expect(render('Some text.')).toContain('<p class="govuk-body">Some text.</p>')
  })

  test('applies govuk-link to links', () => {
    expect(render('[GOV.UK](https://gov.uk)')).toContain(
      '<a class="govuk-link" href="https://gov.uk">GOV.UK</a>'
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

  test('renders tables with govuk-table markup', () => {
    const html = render('| A | B |\n|---|---|\n| 1 | 2 |')
    expect(html).toContain('<table class="govuk-table">')
    expect(html).toContain('<th class="govuk-table__header" scope="col">A</th>')
    expect(html).toContain('<td class="govuk-table__cell">1</td>')
  })
})
