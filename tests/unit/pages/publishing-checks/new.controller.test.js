import { vi, describe, test, expect, beforeEach } from 'vitest'
import { constants as statusCodes } from 'node:http2'

const mockListDocuments = vi.fn()
const mockStartAnalysis = vi.fn()

vi.mock('../../../../src/infra/api/guidance-documents.js', () => ({
  listDocuments: mockListDocuments
}))

vi.mock('../../../../src/infra/api/publishing-jobs.js', () => ({
  startAnalysis: mockStartAnalysis
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

const mockDocuments = {
  items: [
    { id: 'doc-1', title: 'Guidance A', filename: null, status: 'complete' },
    { id: 'doc-2', title: null, filename: 'guide.docx', status: 'complete' },
    { id: 'doc-3', title: 'Draft', filename: null, status: 'processing' }
  ]
}

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
    mockListDocuments.mockResolvedValueOnce(mockDocuments)

    await getNewCheck(buildRequest(), mockToolkit)

    expect(mockView).toHaveBeenCalledWith(
      'publishing-checks/new/page.njk',
      expect.objectContaining({ pageTitle: 'Start a publishing check' })
    )
    expect(mockCode).toHaveBeenCalledWith(statusCodes.HTTP_STATUS_OK)
  })

  test('Should only include complete documents in select items', async () => {
    mockListDocuments.mockResolvedValueOnce(mockDocuments)

    await getNewCheck(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    const values = viewData.selectItems
      .filter((item) => item.value)
      .map((item) => item.value)
    expect(values).toEqual(['doc-1', 'doc-2'])
    expect(values).not.toContain('doc-3')
  })

  test('Should include a blank first item in selectItems', async () => {
    mockListDocuments.mockResolvedValueOnce(mockDocuments)

    await getNewCheck(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.selectItems[0]).toEqual({
      value: '',
      text: 'Select a document'
    })
  })

  test('Should set hasDocuments true when complete docs exist', async () => {
    mockListDocuments.mockResolvedValueOnce(mockDocuments)

    await getNewCheck(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.hasDocuments).toBe(true)
  })

  test('Should set hasDocuments false when no complete docs', async () => {
    mockListDocuments.mockResolvedValueOnce({
      items: [{ id: 'doc-3', title: 'Draft', status: 'processing' }]
    })

    await getNewCheck(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.hasDocuments).toBe(false)
  })

  test('Should degrade gracefully when listDocuments fails', async () => {
    mockListDocuments.mockRejectedValueOnce(new Error('API down'))

    await getNewCheck(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.hasDocuments).toBe(false)
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
    mockListDocuments.mockResolvedValue(mockDocuments)
    mockStartAnalysis.mockResolvedValueOnce({
      jobId: 'job-xyz',
      status: 'pending'
    })

    await postNewCheck(buildRequest({ documentId: 'doc-1' }), mockToolkit)

    expect(mockRedirect).toHaveBeenCalledWith(
      '/publishing-checks/confirmation?jobId=job-xyz'
    )
  })

  test('Should re-render with error when documentId is empty', async () => {
    mockListDocuments.mockResolvedValueOnce(mockDocuments)

    await postNewCheck(buildRequest({ documentId: '' }), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.errorMessage).toBe('Select a document to analyse')
    expect(viewData.showSelectError).toBe(true)
  })

  test('Should re-render with 409 error message', async () => {
    mockListDocuments.mockResolvedValueOnce(mockDocuments)
    const conflict = Object.assign(new Error('Conflict'), {
      statusCode: 409
    })
    mockStartAnalysis.mockRejectedValueOnce(conflict)

    await postNewCheck(buildRequest({ documentId: 'doc-1' }), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.errorMessage).toContain('not been fully processed')
  })

  test('Should re-render with 404 error message', async () => {
    mockListDocuments.mockResolvedValueOnce(mockDocuments)
    const notFound = Object.assign(new Error('Not Found'), {
      statusCode: 404
    })
    mockStartAnalysis.mockRejectedValueOnce(notFound)

    await postNewCheck(buildRequest({ documentId: 'doc-1' }), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.errorMessage).toContain('could not be found')
  })

  test('Should re-render with generic error on unexpected failure', async () => {
    mockListDocuments.mockResolvedValueOnce(mockDocuments)
    mockStartAnalysis.mockRejectedValueOnce(new Error('Network error'))

    await postNewCheck(buildRequest({ documentId: 'doc-1' }), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.errorMessage).toContain('Something went wrong')
  })

  test('Should not set showSelectError for API errors', async () => {
    mockListDocuments.mockResolvedValueOnce(mockDocuments)
    mockStartAnalysis.mockRejectedValueOnce(new Error('API error'))

    await postNewCheck(buildRequest({ documentId: 'doc-1' }), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.showSelectError).toBeFalsy()
  })
})
