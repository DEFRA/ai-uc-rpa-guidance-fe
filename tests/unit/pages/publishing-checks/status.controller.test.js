import { vi, describe, test, expect, beforeEach } from 'vitest'
import { constants as statusCodes } from 'node:http2'

const mockListDocuments = vi.fn()
const mockGetLatestAnalysis = vi.fn()

vi.mock('../../../../src/infra/api/guidance-documents.js', () => ({
  listDocuments: mockListDocuments
}))

vi.mock('../../../../src/infra/api/publishing-jobs.js', () => ({
  getLatestAnalysis: mockGetLatestAnalysis
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

const mockDocuments = [
  { id: 'doc-1', title: 'RPA Guidance', filename: null, status: 'complete' },
  { id: 'doc-2', title: null, filename: 'guidance.docx', status: 'complete' }
]

const mockJob = {
  jobId: 'job-abc',
  status: 'completed',
  updatedAt: '2026-06-15T10:00:00Z'
}

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
    mockListDocuments.mockResolvedValueOnce({ items: [] })

    await getPublishingChecksStatus(buildRequest(), mockToolkit)

    expect(mockView).toHaveBeenCalledWith(
      'publishing-checks/status/page.njk',
      expect.objectContaining({ pageTitle: 'Publishing checks' })
    )
    expect(mockCode).toHaveBeenCalledWith(statusCodes.HTTP_STATUS_OK)
  })

  test('Should set page to publishing-checks for nav highlighting', async () => {
    mockListDocuments.mockResolvedValueOnce({ items: [] })

    await getPublishingChecksStatus(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.page).toBe('publishing-checks')
  })

  test('Should build runs from documents and their latest analysis', async () => {
    mockListDocuments.mockResolvedValueOnce({ items: [mockDocuments[0]] })
    mockGetLatestAnalysis.mockResolvedValueOnce(mockJob)

    await getPublishingChecksStatus(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.runs).toEqual([
      {
        documentId: 'doc-1',
        title: 'RPA Guidance',
        status: 'completed',
        jobId: 'job-abc',
        updatedAt: '2026-06-15T10:00:00Z'
      }
    ])
  })

  test('Should use filename when title is absent', async () => {
    mockListDocuments.mockResolvedValueOnce({ items: [mockDocuments[1]] })
    mockGetLatestAnalysis.mockResolvedValueOnce(mockJob)

    await getPublishingChecksStatus(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.runs[0].title).toBe('guidance.docx')
  })

  test('Should set status to not_run when analysis returns 404', async () => {
    mockListDocuments.mockResolvedValueOnce({ items: [mockDocuments[0]] })
    const notFoundError = Object.assign(new Error('Not Found'), {
      statusCode: 404
    })
    mockGetLatestAnalysis.mockRejectedValueOnce(notFoundError)

    await getPublishingChecksStatus(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.runs[0]).toMatchObject({
      status: 'not_run',
      jobId: null,
      updatedAt: null
    })
  })

  test('Should set status to error on unexpected analysis failure', async () => {
    mockListDocuments.mockResolvedValueOnce({ items: [mockDocuments[0]] })
    mockGetLatestAnalysis.mockRejectedValueOnce(new Error('Server error'))

    await getPublishingChecksStatus(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.runs[0].status).toBe('error')
  })

  test('Should render empty runs when listDocuments fails', async () => {
    mockListDocuments.mockRejectedValueOnce(new Error('API down'))

    await getPublishingChecksStatus(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.runs).toEqual([])
  })
})
