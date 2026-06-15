import { vi, describe, test, expect, beforeEach } from 'vitest'

import { constants as statusCodes } from 'node:http2'

vi.mock('../../../../src/infra/api/guidance-documents.js', () => ({
  initiateUpload: vi.fn()
}))

vi.mock('../../../../src/config/config.js', () => ({
  config: { get: vi.fn().mockReturnValue(null) }
}))

const mockView = vi.fn()
const mockCode = vi.fn()

const mockToolkit = {
  view: mockView.mockReturnThis(),
  code: mockCode.mockReturnThis()
}

const buildRequest = (uploadId) => ({
  query: { uploadId }
})

describe('#getUploadGuidanceDocumentFile', () => {
  let getUploadGuidanceDocumentFile

  beforeEach(async () => {
    vi.clearAllMocks()
    const module = await import('../../../../src/pages/guidance-documents/upload/file/controller.js')
    getUploadGuidanceDocumentFile = module.getUploadGuidanceDocumentFile
  })

  test('Should render the file upload page with 200 and the constructed uploadUrl', async () => {
    await getUploadGuidanceDocumentFile(buildRequest('abc-123'), mockToolkit)

    expect(mockView).toHaveBeenCalledWith('guidance-documents/upload/file/page.njk', expect.objectContaining({
      pageTitle: 'Upload your document',
      uploadUrl: '/upload-and-scan/abc-123'
    }))
    expect(mockCode).toHaveBeenCalledWith(statusCodes.HTTP_STATUS_OK)
  })

  test('Should return 400 when uploadId query param is missing', async () => {
    const result = await getUploadGuidanceDocumentFile(buildRequest(undefined), mockToolkit)

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
  })
})
