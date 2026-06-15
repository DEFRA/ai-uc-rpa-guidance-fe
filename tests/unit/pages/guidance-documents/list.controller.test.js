import { vi, describe, test, expect, beforeEach } from 'vitest'

import { constants as statusCodes } from 'node:http2'

const mockListDocuments = vi.fn()

vi.mock('../../../../src/infra/api/guidance-documents.js', () => ({
  listDocuments: mockListDocuments
}))

const mockView = vi.fn()
const mockCode = vi.fn()

const mockToolkit = {
  view: mockView.mockReturnThis(),
  code: mockCode.mockReturnThis()
}

const buildRequest = (page) => ({
  query: { page },
  logger: { error: vi.fn() }
})

const emptyResult = { items: [], total: 0, page: 1, pageSize: 10 }

describe('#getGuidanceDocuments', () => {
  let getGuidanceDocuments

  beforeEach(async () => {
    vi.clearAllMocks()
    const module = await import(
      '../../../../src/pages/guidance-documents/list/controller.js'
    )
    getGuidanceDocuments = module.getGuidanceDocuments
  })

  test('Should render the guidance documents list page with 200', async () => {
    mockListDocuments.mockResolvedValueOnce(emptyResult)

    await getGuidanceDocuments(buildRequest(), mockToolkit)

    expect(mockView).toHaveBeenCalledWith(
      'guidance-documents/list/page.njk',
      expect.objectContaining({ pageTitle: 'Guidance documents' })
    )
    expect(mockCode).toHaveBeenCalledWith(statusCodes.HTTP_STATUS_OK)
  })

  test('Should include home breadcrumb', async () => {
    mockListDocuments.mockResolvedValueOnce(emptyResult)

    await getGuidanceDocuments(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.breadcrumbs).toContainEqual({ text: 'Home', href: '/' })
  })

  test('Should pass documents and pagination to the view', async () => {
    const mockDoc = {
      id: 'doc-1',
      title: 'Test doc',
      status: 'complete',
      createdAt: '2026-01-01T00:00:00Z'
    }
    mockListDocuments.mockResolvedValueOnce({
      items: [mockDoc],
      total: 1,
      page: 1,
      pageSize: 10
    })

    await getGuidanceDocuments(buildRequest(1), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.documents).toEqual([mockDoc])
    expect(viewData.pagination).toEqual(
      expect.objectContaining({ page: 1, total: 1, totalPages: 1 })
    )
  })

  test('Should render with empty documents list when API fails', async () => {
    const request = buildRequest()
    mockListDocuments.mockRejectedValueOnce(new Error('API down'))

    await getGuidanceDocuments(request, mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.documents).toEqual([])
    expect(request.logger.error).toHaveBeenCalled()
  })
})
