import { describe, test, expect } from 'vitest'
import {
  accordionItems,
  renderLinks,
  worstSeverity,
  SEVERITY_ORDER
} from '../../../src/filters/accordion-items.js'

const makeFinding = (overrides = {}) => ({
  category: 'Clarity',
  section: '1.1',
  severity: 'high',
  issue: 'Ambiguous.',
  why_it_matters: 'Confusing.',
  recommendation: 'Rewrite.',
  ...overrides
})

describe('#accordionItems', () => {
  test('Should return empty array for empty findings', () => {
    expect(accordionItems([])).toEqual([])
  })

  test('Should return empty array for null/undefined input', () => {
    expect(accordionItems(null)).toEqual([])
    expect(accordionItems(undefined)).toEqual([])
  })

  test('Should group findings by category', () => {
    const findings = [
      makeFinding({ category: 'Clarity', severity: 'high' }),
      makeFinding({ category: 'Clarity', severity: 'low' }),
      makeFinding({ category: 'Completeness', severity: 'critical' })
    ]

    const items = accordionItems(findings)

    expect(items).toHaveLength(2)
    expect(items[0].heading.html).toContain('Clarity')
    expect(items[1].heading.html).toContain('Completeness')
  })

  test('Should show worst severity tag in heading', () => {
    const findings = [
      makeFinding({ category: 'Clarity', severity: 'low' }),
      makeFinding({ category: 'Clarity', severity: 'critical' }),
      makeFinding({ category: 'Clarity', severity: 'medium' })
    ]

    const [item] = accordionItems(findings)

    expect(item.heading.html).toContain('govuk-tag--red')
    expect(item.heading.html).toContain('critical')
  })

  test('Should show correct count in heading', () => {
    const findings = [
      makeFinding({ category: 'Clarity' }),
      makeFinding({ category: 'Clarity' }),
      makeFinding({ category: 'Clarity' })
    ]

    const [item] = accordionItems(findings)

    expect(item.heading.html).toContain('3 issues')
  })

  test('Should use singular "issue" for count of 1', () => {
    const findings = [makeFinding({ category: 'Solo' })]

    const [item] = accordionItems(findings)

    expect(item.heading.html).toContain('1 issue')
    expect(item.heading.html).not.toContain('1 issues')
  })

  test('Should render finding card HTML in content', () => {
    const finding = makeFinding({
      category: 'Clarity',
      severity: 'high',
      section: '2.3',
      issue: 'Too vague.',
      why_it_matters: 'Users confused.',
      recommendation: 'Be specific.'
    })

    const [item] = accordionItems([finding])

    expect(item.content.html).toContain('app-finding-card')
    expect(item.content.html).toContain('Too vague.')
    expect(item.content.html).toContain('Users confused.')
    expect(item.content.html).toContain('Be specific.')
    expect(item.content.html).toContain('govuk-tag--orange') // high severity
    expect(item.content.html).toContain('2.3')
  })

  test('Should use "Uncategorised" for findings without a category', () => {
    const finding = { ...makeFinding(), category: undefined }

    const items = accordionItems([finding])

    expect(items[0].heading.html).toContain('Uncategorised')
  })
})

describe('#worstSeverity', () => {
  test('Should return critical as worst', () => {
    const findings = [
      makeFinding({ severity: 'info' }),
      makeFinding({ severity: 'critical' }),
      makeFinding({ severity: 'medium' })
    ]
    expect(worstSeverity(findings)).toBe('critical')
  })

  test('Should default to info for unknown severities', () => {
    const findings = [makeFinding({ severity: 'info' })]
    expect(worstSeverity(findings)).toBe('info')
  })

  test('Should return the single severity for a single finding', () => {
    expect(worstSeverity([makeFinding({ severity: 'medium' })])).toBe('medium')
  })
})

describe('#SEVERITY_ORDER', () => {
  test('Should have critical ranked before high', () => {
    expect(SEVERITY_ORDER.critical).toBeLessThan(SEVERITY_ORDER.high)
  })

  test('Should have info ranked last', () => {
    const allRanks = Object.values(SEVERITY_ORDER)
    expect(SEVERITY_ORDER.info).toBe(Math.max(...allRanks))
  })
})

describe('#renderLinks', () => {
  const anchor = (href, label) =>
    `<a href="${href}" class="govuk-link" target="_blank" rel="noopener noreferrer">${label}</a>`

  test('Should return plain text unchanged', () => {
    expect(renderLinks('no links here')).toBe('no links here')
  })

  test('Should return an empty string unchanged', () => {
    expect(renderLinks('')).toBe('')
  })

  test('Should convert a markdown link to an anchor', () => {
    expect(renderLinks('[click here](https://example.com)')).toBe(
      anchor('https://example.com', 'click here')
    )
  })

  test('Should convert a bare https URL in parens to an anchor', () => {
    expect(renderLinks('(https://example.com)')).toBe(
      anchor('https://example.com', 'https://example.com')
    )
  })

  test('Should convert a bare http URL in parens to an anchor', () => {
    expect(renderLinks('(http://example.com)')).toBe(
      anchor('http://example.com', 'http://example.com')
    )
  })

  test('Should leave a markdown link preceded by a backtick unchanged', () => {
    const input = '`[click here](https://example.com)`'
    expect(renderLinks(input)).toBe(input)
  })

  test('Should leave a markdown link preceded by a single quote unchanged', () => {
    const input = "'[click here](https://example.com)'"
    expect(renderLinks(input)).toBe(input)
  })

  test('Should leave a markdown link preceded by a double quote unchanged', () => {
    const input = '"[click here](https://example.com)"'
    expect(renderLinks(input)).toBe(input)
  })

  test('Should leave a markdown link followed by a double quote unchanged', () => {
    expect(renderLinks('[click here](https://example.com)"')).toBe(
      '[click here](https://example.com)"'
    )
  })

  test('Should convert multiple markdown links in the same string', () => {
    const input = '[first](https://a.com) and [second](https://b.com)'
    expect(renderLinks(input)).toBe(
      `${anchor('https://a.com', 'first')} and ${anchor('https://b.com', 'second')}`
    )
  })

  test('Should convert both a markdown link and a bare URL in the same string', () => {
    const input = 'See [docs](https://docs.example.com) or (https://alt.example.com)'
    expect(renderLinks(input)).toBe(
      `See ${anchor('https://docs.example.com', 'docs')} or ${anchor('https://alt.example.com', 'https://alt.example.com')}`
    )
  })

  test('Should not convert a bare URL preceded by ]', () => {
    expect(renderLinks('foo](https://example.com)')).toBe('foo](https://example.com)')
  })

  test('Should preserve surrounding text', () => {
    expect(renderLinks('Visit [our site](https://example.com) for more info.')).toBe(
      `Visit ${anchor('https://example.com', 'our site')} for more info.`
    )
  })
})
