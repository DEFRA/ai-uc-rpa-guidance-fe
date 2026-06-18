import { vi, describe, test, expect, beforeEach } from 'vitest'

import { constants as statusCodes } from 'node:http2'

const mockStartUpload = vi.fn()
vi.mock('../../../../src/services/guidance-documents.js', () => ({
  startUpload: mockStartUpload
}))

vi.mock('../../../../src/config/config.js', () => ({
  config: { get: vi.fn().mockReturnValue(null) }
}))

const mockView = vi.fn()
const mockCode = vi.fn()
const mockRedirect = vi.fn()

const mockToolkit = {
  view: mockView.mockReturnThis(),
  code: mockCode.mockReturnThis(),
  redirect: mockRedirect.mockReturnThis()
}

const mockRequest = {
  server: { info: { uri: 'http://localhost:3000' } }
}

describe('#getUploadGuidanceDocument', () => {
  let getUploadGuidanceDocument

  beforeEach(async () => {
    vi.clearAllMocks()
    const module = await import('../../../../src/pages/guidance-documents/upload/controller.js')
    getUploadGuidanceDocument = module.getUploadGuidanceDocument
  })

  test('Should render the upload info page with 200', async () => {
    await getUploadGuidanceDocument(mockRequest, mockToolkit)

    expect(mockView).toHaveBeenCalledWith('guidance-documents/upload/page.njk', expect.objectContaining({
      pageTitle: 'Upload a guidance document'
    }))
    expect(mockCode).toHaveBeenCalledWith(statusCodes.HTTP_STATUS_OK)
  })

  test('Should include breadcrumbs with home and guidance-documents links', async () => {
    await getUploadGuidanceDocument(mockRequest, mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.breadcrumbs).toContainEqual({ text: 'Home', href: '/' })
    expect(viewData.breadcrumbs).toContainEqual({ text: 'Guidance documents', href: '/guidance-documents' })
  })
})

describe('#postUploadGuidanceDocument', () => {
  let postUploadGuidanceDocument

  beforeEach(async () => {
    vi.clearAllMocks()
    const module = await import('../../../../src/pages/guidance-documents/upload/controller.js')
    postUploadGuidanceDocument = module.postUploadGuidanceDocument
  })

  test('Should call startUpload with the correct redirect URL', async () => {
    mockStartUpload.mockResolvedValueOnce({ succeeded: true, uploadId: 'test-upload-id' })

    await postUploadGuidanceDocument(mockRequest, mockToolkit)

    expect(mockStartUpload).toHaveBeenCalledWith('/guidance-documents/upload/confirmation')
  })

  test('Should redirect to the file upload page with uploadId as a query param', async () => {
    mockStartUpload.mockResolvedValueOnce({ succeeded: true, uploadId: 'test-upload-id' })

    await postUploadGuidanceDocument(mockRequest, mockToolkit)

    expect(mockRedirect).toHaveBeenCalledWith('/guidance-documents/upload/file?uploadId=test-upload-id')
  })

  test('Should not use the yar session', async () => {
    mockStartUpload.mockResolvedValueOnce({ succeeded: true, uploadId: 'test-upload-id' })

    const requestWithYar = { ...mockRequest, yar: { set: vi.fn() } }
    await postUploadGuidanceDocument(requestWithYar, mockToolkit)

    expect(requestWithYar.yar.set).not.toHaveBeenCalled()
  })
})
