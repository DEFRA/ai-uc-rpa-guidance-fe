import { describe, test, expect } from 'vitest'
import {
  accordionItems,
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
