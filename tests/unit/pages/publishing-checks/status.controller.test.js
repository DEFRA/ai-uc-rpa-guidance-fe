import { vi, describe, test, expect, beforeEach } from 'vitest'
import { constants as statusCodes } from 'node:http2'

const mockListCheckRuns = vi.fn()

vi.mock('../../../../src/services/publishing-checks.js', () => ({
  listCheckRuns: mockListCheckRuns
}))

const mockView = vi.fn()
const mockCode = vi.fn()

const mockToolkit = {
  view: mockView.mockReturnThis(),
  code: mockCode.mockReturnThis()
}

const buildRequest = () => ({
  logger: { error: vi.fn() }
})

const mockRuns = [
  {
    documentId: 'doc-1',
    title: 'RPA Guidance',
    status: 'completed',
    jobId: 'job-abc',
    updatedAt: '2026-06-15T10:00:00Z'
  }
]

describe('#getPublishingChecksStatus', () => {
  let getPublishingChecksStatus

  beforeEach(async () => {
    vi.clearAllMocks()
    mockView.mockReturnThis()
    mockCode.mockReturnThis()
    const module = await import(
      '../../../../src/pages/publishing-checks/status/controller.js'
    )
    getPublishingChecksStatus = module.getPublishingChecksStatus
  })

  test('Should render status page with 200', async () => {
    mockListCheckRuns.mockResolvedValueOnce([])

    await getPublishingChecksStatus(buildRequest(), mockToolkit)

    expect(mockView).toHaveBeenCalledWith(
      'publishing-checks/status/page.njk',
      expect.objectContaining({ pageTitle: 'Publishing checks' })
    )
    expect(mockCode).toHaveBeenCalledWith(statusCodes.HTTP_STATUS_OK)
  })

  test('Should set page to publishing-checks for nav highlighting', async () => {
    mockListCheckRuns.mockResolvedValueOnce([])

    await getPublishingChecksStatus(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.page).toBe('publishing-checks')
  })

  test('Should pass runs from service to view', async () => {
    mockListCheckRuns.mockResolvedValueOnce(mockRuns)

    await getPublishingChecksStatus(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.runs).toEqual(mockRuns)
  })

  test('Should surface service errors (no try/catch)', async () => {
    const boom = Object.assign(new Error('API down'), { isBoom: true, output: { statusCode: 500 } })
    mockListCheckRuns.mockRejectedValueOnce(boom)

    await expect(getPublishingChecksStatus(buildRequest(), mockToolkit)).rejects.toMatchObject({ isBoom: true })
  })
})
