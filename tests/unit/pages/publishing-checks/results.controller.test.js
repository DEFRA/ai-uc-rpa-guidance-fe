import { vi, describe, test, expect, beforeEach } from 'vitest'

import { constants as statusCodes } from 'node:http2'

const mockAnalyseDocument = vi.fn()

vi.mock('../../../../src/infra/api/analyse.js', () => ({
  analyseDocument: mockAnalyseDocument
}))

const mockView = vi.fn()
const mockCode = vi.fn()

const mockToolkit = {
  view: mockView.mockReturnThis(),
  code: mockCode.mockReturnThis()
}

const buildRequest = (id = 'check-1') => ({
  params: { id },
  logger: { error: vi.fn() }
})

const mockResult = {
  verdict: 'not_ready',
  summary: 'Several issues found.',
  document_title: 'RPA Guidance v2',
  findings: [
    {
      category: 'Clarity',
      section: '2.1',
      severity: 'high',
      issue: 'Ambiguous wording',
      why_it_matters: 'Could mislead users.',
      recommendation: 'Rewrite section.'
    },
    {
      category: 'Clarity',
      section: '2.3',
      severity: 'medium',
      issue: 'Technical jargon',
      why_it_matters: 'Not accessible.',
      recommendation: 'Simplify language.'
    },
    {
      category: 'Completeness',
      section: '4.1',
      severity: 'critical',
      issue: 'Missing step',
      why_it_matters: 'Users cannot complete task.',
      recommendation: 'Add missing step.'
    }
  ],
  good_points: ['Clear structure', 'Good examples'],
  usage: { input_tokens: 1200, output_tokens: 450 }
}

describe('#getPublishingCheckResults', () => {
  let getPublishingCheckResults

  beforeEach(async () => {
    vi.clearAllMocks()
    const module = await import(
      '../../../../src/pages/publishing-checks/results/controller.js'
    )
    getPublishingCheckResults = module.getPublishingCheckResults
  })

  test('Should render results page with 200 on success', async () => {
    mockAnalyseDocument.mockResolvedValueOnce(mockResult)

    await getPublishingCheckResults(buildRequest(), mockToolkit)

    expect(mockView).toHaveBeenCalledWith(
      'publishing-checks/results/page.njk',
      expect.objectContaining({ pageTitle: 'RPA Guidance v2' })
    )
    expect(mockCode).toHaveBeenCalledWith(statusCodes.HTTP_STATUS_OK)
  })

  test('Should set page to publishing-checks for nav highlighting', async () => {
    mockAnalyseDocument.mockResolvedValueOnce(mockResult)

    await getPublishingCheckResults(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.page).toBe('publishing-checks')
  })

  test('Should pass result to the view', async () => {
    mockAnalyseDocument.mockResolvedValueOnce(mockResult)

    await getPublishingCheckResults(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.result).toEqual(mockResult)
  })

  test('Should compute severityCounts in order critical → high → medium', async () => {
    mockAnalyseDocument.mockResolvedValueOnce(mockResult)

    await getPublishingCheckResults(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.severityCounts).toEqual([
      { severity: 'critical', count: 1 },
      { severity: 'high', count: 1 },
      { severity: 'medium', count: 1 }
    ])
  })

  test('Should include breadcrumbs with Publishing checks parent', async () => {
    mockAnalyseDocument.mockResolvedValueOnce(mockResult)

    await getPublishingCheckResults(buildRequest('check-1'), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.breadcrumbs).toEqual([
      { text: 'Home', href: '/' },
      { text: 'Publishing checks', href: '/publishing-checks' },
      { text: 'RPA Guidance v2', href: '#' }
    ])
  })

  test('Should call analyseDocument with the route param id', async () => {
    mockAnalyseDocument.mockResolvedValueOnce(mockResult)

    await getPublishingCheckResults(buildRequest('my-check-id'), mockToolkit)

    expect(mockAnalyseDocument).toHaveBeenCalledWith('my-check-id')
  })

  test('Should handle empty findings gracefully', async () => {
    mockAnalyseDocument.mockResolvedValueOnce({
      ...mockResult,
      findings: []
    })

    await getPublishingCheckResults(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.severityCounts).toEqual([])
  })
})

describe('#buildSeverityCounts', () => {
  let buildSeverityCounts

  beforeEach(async () => {
    vi.clearAllMocks()
    const module = await import(
      '../../../../src/pages/publishing-checks/results/controller.js'
    )
    buildSeverityCounts = module.buildSeverityCounts
  })

  test('Should return counts in severity order', () => {
    const findings = [
      { severity: 'low' },
      { severity: 'critical' },
      { severity: 'low' },
      { severity: 'info' }
    ]
    expect(buildSeverityCounts(findings)).toEqual([
      { severity: 'critical', count: 1 },
      { severity: 'low', count: 2 },
      { severity: 'info', count: 1 }
    ])
  })

  test('Should omit severities with zero findings', () => {
    const findings = [{ severity: 'medium' }]
    const result = buildSeverityCounts(findings)
    expect(result.map(r => r.severity)).toEqual(['medium'])
  })

  test('Should return empty array for empty findings', () => {
    expect(buildSeverityCounts([])).toEqual([])
  })
})
