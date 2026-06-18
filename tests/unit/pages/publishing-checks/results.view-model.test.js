import { describe, test, expect } from 'vitest'
import { resultsViewModel } from '../../../../src/pages/publishing-checks/results/view-model.js'

const mockResult = {
  verdict: 'not_ready',
  summary: 'Several issues found.',
  document_title: 'RPA Guidance v2',
  findings: [
    { category: 'Clarity', section: '2.1', severity: 'high', issue: 'A', why_it_matters: 'B', recommendation: 'C' },
    { category: 'Clarity', section: '2.3', severity: 'medium', issue: 'D', why_it_matters: 'E', recommendation: 'F' },
    { category: 'Completeness', section: '4.1', severity: 'critical', issue: 'G', why_it_matters: 'H', recommendation: 'I' }
  ],
  good_points: ['Clear structure'],
  usage: { input_tokens: 1200, output_tokens: 450 }
}

describe('#resultsViewModel', () => {
  test('Should set pageTitle from document_title', () => {
    expect(resultsViewModel(mockResult).pageTitle).toBe('RPA Guidance v2')
  })

  test('Should set page for nav highlighting', () => {
    expect(resultsViewModel(mockResult).page).toBe('publishing-checks')
  })

  test('Should pass the raw result through', () => {
    expect(resultsViewModel(mockResult).result).toEqual(mockResult)
  })

  test('Should compute severityCounts in order', () => {
    expect(resultsViewModel(mockResult).severityCounts).toEqual([
      { severity: 'critical', count: 1 },
      { severity: 'high', count: 1 },
      { severity: 'medium', count: 1 }
    ])
  })

  test('Should include findingGroups grouped by category', () => {
    const { findingGroups } = resultsViewModel(mockResult)
    expect(findingGroups).toHaveLength(2)
    expect(findingGroups[0].category).toBe('Clarity')
    expect(findingGroups[1].category).toBe('Completeness')
  })

  test('Should set worst severity on each findingGroup', () => {
    const { findingGroups } = resultsViewModel(mockResult)
    expect(findingGroups[0].worst).toBe('high')
    expect(findingGroups[1].worst).toBe('critical')
  })

  test('Should include breadcrumbs with document title', () => {
    const { breadcrumbs } = resultsViewModel(mockResult)
    expect(breadcrumbs).toContainEqual({ text: 'Home', href: '/' })
    expect(breadcrumbs).toContainEqual({ text: 'Publishing checks', href: '/publishing-checks' })
    expect(breadcrumbs).toContainEqual({ text: 'RPA Guidance v2', href: '#' })
  })

  test('Should handle empty findings', () => {
    const vm = resultsViewModel({ ...mockResult, findings: [] })
    expect(vm.severityCounts).toEqual([])
    expect(vm.findingGroups).toEqual([])
  })

  test('Should handle null findings', () => {
    const vm = resultsViewModel({ ...mockResult, findings: null })
    expect(vm.severityCounts).toEqual([])
    expect(vm.findingGroups).toEqual([])
  })
})
