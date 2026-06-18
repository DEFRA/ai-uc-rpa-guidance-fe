import { vi, describe, test, expect, beforeEach } from 'vitest'
import { constants as statusCodes } from 'node:http2'

const mockGetCompleteDocuments = vi.fn()
const mockStartCheck = vi.fn()

vi.mock('../../../../src/services/guidance-documents.js', () => ({
  getCompleteDocuments: mockGetCompleteDocuments
}))

vi.mock('../../../../src/services/publishing-checks.js', () => ({
  startCheck: mockStartCheck
}))

const mockView = vi.fn()
const mockCode = vi.fn()
const mockRedirect = vi.fn()

const mockToolkit = {
  view: mockView.mockReturnThis(),
  code: mockCode.mockReturnThis(),
  redirect: mockRedirect
}

const buildRequest = (payload = {}) => ({
  payload,
  logger: { error: vi.fn() }
})

const mockDocuments = [
  { id: 'doc-1', title: 'Guidance A', filename: null, status: 'complete' },
  { id: 'doc-2', title: null, filename: 'guide.docx', status: 'complete' }
]

describe('#getNewCheck', () => {
  let getNewCheck

  beforeEach(async () => {
    vi.clearAllMocks()
    mockView.mockReturnThis()
    mockCode.mockReturnThis()
    const module = await import(
      '../../../../src/pages/publishing-checks/new/controller.js'
    )
    getNewCheck = module.getNewCheck
  })

  test('Should render new check page with 200', async () => {
    mockGetCompleteDocuments.mockResolvedValueOnce(mockDocuments)

    await getNewCheck(buildRequest(), mockToolkit)

    expect(mockView).toHaveBeenCalledWith(
      'publishing-checks/new/page.njk',
      expect.objectContaining({ pageTitle: 'Start a publishing check' })
    )
    expect(mockCode).toHaveBeenCalledWith(statusCodes.HTTP_STATUS_OK)
  })

  test('Should only include complete documents in select items', async () => {
    mockGetCompleteDocuments.mockResolvedValueOnce(mockDocuments)

    await getNewCheck(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    const values = viewData.selectItems
      .filter((item) => item.value)
      .map((item) => item.value)
    expect(values).toEqual(['doc-1', 'doc-2'])
  })

  test('Should include a blank first item in selectItems', async () => {
    mockGetCompleteDocuments.mockResolvedValueOnce(mockDocuments)

    await getNewCheck(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.selectItems[0]).toEqual({ value: '', text: 'Select a document' })
  })

  test('Should set hasDocuments true when complete docs exist', async () => {
    mockGetCompleteDocuments.mockResolvedValueOnce(mockDocuments)

    await getNewCheck(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.hasDocuments).toBe(true)
  })

  test('Should set hasDocuments false when no documents', async () => {
    mockGetCompleteDocuments.mockResolvedValueOnce([])

    await getNewCheck(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.hasDocuments).toBe(false)
  })

  test('Should surface service errors (no try/catch)', async () => {
    const boom = Object.assign(new Error('API down'), { isBoom: true })
    mockGetCompleteDocuments.mockRejectedValueOnce(boom)

    await expect(getNewCheck(buildRequest(), mockToolkit)).rejects.toMatchObject({ isBoom: true })
  })
})

describe('#postNewCheck', () => {
  let postNewCheck

  beforeEach(async () => {
    vi.clearAllMocks()
    mockView.mockReturnThis()
    mockCode.mockReturnThis()
    const module = await import(
      '../../../../src/pages/publishing-checks/new/controller.js'
    )
    postNewCheck = module.postNewCheck
  })

  test('Should redirect to confirmation with jobId on success', async () => {
    mockStartCheck.mockResolvedValueOnce({ succeeded: true, jobId: 'job-xyz', reason: null })

    await postNewCheck(buildRequest({ documentId: 'doc-1' }), mockToolkit)

    expect(mockRedirect).toHaveBeenCalledWith(
      '/publishing-checks/confirmation?jobId=job-xyz'
    )
  })

  test('Should re-render with conflict message for 409', async () => {
    mockStartCheck.mockResolvedValueOnce({ succeeded: false, reason: 'conflict', jobId: null })
    mockGetCompleteDocuments.mockResolvedValueOnce(mockDocuments)

    await postNewCheck(buildRequest({ documentId: 'doc-1' }), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.errorMessage).toContain('not been fully processed')
  })

  test('Should re-render with not-found message for 404', async () => {
    mockStartCheck.mockResolvedValueOnce({ succeeded: false, reason: 'not_found', jobId: null })
    mockGetCompleteDocuments.mockResolvedValueOnce(mockDocuments)

    await postNewCheck(buildRequest({ documentId: 'doc-1' }), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.errorMessage).toContain('could not be found')
  })

  test('Should not set showSelectError for API errors', async () => {
    mockStartCheck.mockResolvedValueOnce({ succeeded: false, reason: 'conflict', jobId: null })
    mockGetCompleteDocuments.mockResolvedValueOnce(mockDocuments)

    await postNewCheck(buildRequest({ documentId: 'doc-1' }), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.showSelectError).toBeFalsy()
  })

  test('Should surface unexpected service errors to catch-all', async () => {
    const boom = Object.assign(new Error('Network error'), { isBoom: true, output: { statusCode: 500 } })
    mockStartCheck.mockRejectedValueOnce(boom)

    await expect(postNewCheck(buildRequest({ documentId: 'doc-1' }), mockToolkit))
      .rejects.toMatchObject({ isBoom: true })
  })
})
