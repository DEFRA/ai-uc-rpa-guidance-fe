import { vi, describe, test, expect, beforeEach } from 'vitest'

import { constants as statusCodes } from 'node:http2'

const mockView = vi.fn()
const mockCode = vi.fn()

const mockToolkit = {
  view: mockView.mockReturnThis(),
  code: mockCode.mockReturnThis()
}

const buildRequest = (uploadId) => ({
  query: { uploadId }
})

describe('#getUploadConfirmation', () => {
  let getUploadConfirmation

  beforeEach(async () => {
    vi.clearAllMocks()
    const module = await import('../../../../src/pages/guidance-documents/upload/confirmation/controller.js')
    getUploadConfirmation = module.getUploadConfirmation
  })

  test('Should render the confirmation page with 200 and the uploadId from query params', async () => {
    await getUploadConfirmation(buildRequest('abc-123'), mockToolkit)

    expect(mockView).toHaveBeenCalledWith(
      'guidance-documents/upload/confirmation/page.njk',
      expect.objectContaining({
        pageTitle: 'Document uploaded',
        uploadId: 'abc-123'
      })
    )
    expect(mockCode).toHaveBeenCalledWith(statusCodes.HTTP_STATUS_OK)
  })

  test('Should render confirmation page when uploadId is absent', async () => {
    await getUploadConfirmation(buildRequest(undefined), mockToolkit)

    expect(mockView).toHaveBeenCalledWith(
      'guidance-documents/upload/confirmation/page.njk',
      expect.objectContaining({
        pageTitle: 'Document uploaded',
        uploadId: undefined
      })
    )
    expect(mockCode).toHaveBeenCalledWith(statusCodes.HTTP_STATUS_OK)
  })
})
