import { describe, test, expect } from 'vitest'
import { severityCounts, buildSeverityGroups } from '../../../src/common/findings.js'

const findings = [
  { id: 0, title: 'A', location: 'S1', severity: 'low' },
  { id: 1, title: 'B', location: 'S2', severity: 'critical' },
  { id: 2, title: 'C', location: 'S3', severity: 'high' },
  { id: 3, title: 'D', location: 'S4', severity: 'medium' },
  { id: 4, title: 'E', location: 'S5', severity: 'high' }
]

const hrefFor = (id) => `/x/${id}`

describe('#severityCounts', () => {
  test('Should count per severity in worst-first order, omitting zeros', () => {
    expect(severityCounts(findings)).toEqual([
      { severity: 'critical', count: 1 },
      { severity: 'high', count: 2 },
      { severity: 'medium', count: 1 },
      { severity: 'low', count: 1 }
    ])
  })

  test('Should return an empty array for no findings', () => {
    expect(severityCounts([])).toEqual([])
  })
})

describe('#buildSeverityGroups', () => {
  test('Should put critical/high in important and medium/low/info in suggestions', () => {
    const { important, suggestions } = buildSeverityGroups(findings, hrefFor)

    // critical + 2 high = 3 important; medium + low = 2 suggestions
    expect(important).toHaveLength(3)
    expect(suggestions).toHaveLength(2)
  })

  test('Should order important worst-first, stable within equal severity', () => {
    const { important } = buildSeverityGroups(findings, hrefFor)

    // critical (id 1), then the two highs in original order (id 2, then id 4)
    expect(important.map((i) => i.title.text)).toEqual(['B', 'C', 'E'])
  })

  test('Should build href, hint and a severity status tag per item', () => {
    const { important } = buildSeverityGroups(findings, hrefFor)
    const first = important[0]

    expect(first.href).toBe('/x/1')
    expect(first.hint.text).toBe('S2')
    expect(first.status.tag).toEqual({ text: 'Critical', classes: 'govuk-tag--red' })
  })

  test('Should treat info severity as a suggestion', () => {
    const withInfo = [{ id: 0, title: 'I', location: 'S', severity: 'info' }]
    const { important, suggestions } = buildSeverityGroups(withInfo, hrefFor)

    expect(important).toHaveLength(0)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].status.tag.classes).toBe('govuk-tag--grey')
  })
})
