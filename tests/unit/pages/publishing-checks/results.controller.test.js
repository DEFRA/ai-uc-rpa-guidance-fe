import { vi, describe, test, expect, beforeEach } from 'vitest'
import { constants as statusCodes } from 'node:http2'

const mockGetCheckResults = vi.fn()

vi.mock('../../../../src/services/publishing-checks.js', () => ({
  getCheckResults: mockGetCheckResults
}))

const mockView = vi.fn()
const mockCode = vi.fn()

const mockToolkit = {
  view: mockView.mockReturnThis(),
  code: mockCode.mockReturnThis()
}

const buildRequest = (documentId = 'check-1') => ({
  params: { documentId },
  logger: { error: vi.fn() }
})

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
    mockGetCheckResults.mockResolvedValueOnce({ succeeded: true, result: mockResult })

    await getPublishingCheckResults(buildRequest(), mockToolkit)

    expect(mockView).toHaveBeenCalledWith(
      'publishing-checks/results/page.njk',
      expect.objectContaining({ pageTitle: 'RPA Guidance v2' })
    )
    expect(mockCode).toHaveBeenCalledWith(statusCodes.HTTP_STATUS_OK)
  })

  test('Should set page to publishing-checks for nav highlighting', async () => {
    mockGetCheckResults.mockResolvedValueOnce({ succeeded: true, result: mockResult })

    await getPublishingCheckResults(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.page).toBe('publishing-checks')
  })

  test('Should pass result to the view', async () => {
    mockGetCheckResults.mockResolvedValueOnce({ succeeded: true, result: mockResult })

    await getPublishingCheckResults(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.result).toEqual(mockResult)
  })

  test('Should include severityCounts in view data', async () => {
    mockGetCheckResults.mockResolvedValueOnce({ succeeded: true, result: mockResult })

    await getPublishingCheckResults(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.severityCounts).toEqual([
      { severity: 'critical', count: 1 },
      { severity: 'high', count: 1 },
      { severity: 'medium', count: 1 }
    ])
  })

  test('Should include findingGroups in view data', async () => {
    mockGetCheckResults.mockResolvedValueOnce({ succeeded: true, result: mockResult })

    await getPublishingCheckResults(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.findingGroups).toHaveLength(2)
    expect(viewData.findingGroups[0].category).toBe('Clarity')
  })

  test('Should include breadcrumbs with Publishing checks parent', async () => {
    mockGetCheckResults.mockResolvedValueOnce({ succeeded: true, result: mockResult })

    await getPublishingCheckResults(buildRequest('check-1'), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.breadcrumbs).toEqual([
      { text: 'Home', href: '/' },
      { text: 'Publishing checks', href: '/publishing-checks' },
      { text: 'RPA Guidance v2', href: '#' }
    ])
  })

  test('Should call getCheckResults with the route param id', async () => {
    mockGetCheckResults.mockResolvedValueOnce({ succeeded: true, result: mockResult })

    await getPublishingCheckResults(buildRequest('my-check-id'), mockToolkit)

    expect(mockGetCheckResults).toHaveBeenCalledWith('my-check-id')
  })

  test('Should throw Boom 404 when outcome is not_found', async () => {
    mockGetCheckResults.mockResolvedValueOnce({ succeeded: false, reason: 'not_found', result: null })

    await expect(getPublishingCheckResults(buildRequest(), mockToolkit))
      .rejects.toMatchObject({ isBoom: true, output: { statusCode: 404 } })
  })

  test('Should surface unexpected service errors', async () => {
    const boom = Object.assign(new Error('Server error'), { isBoom: true, output: { statusCode: 500 } })
    mockGetCheckResults.mockRejectedValueOnce(boom)

    await expect(getPublishingCheckResults(buildRequest(), mockToolkit)).rejects.toMatchObject({ isBoom: true })
  })
})
