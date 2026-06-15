import { constants as statusCodes } from 'node:http2'

import { createServer } from '../../../../src/server/server.js'

describe('#guidanceDocumentsUploadFileController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should respond with 400 when uploadId query param is missing', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/guidance-documents/upload/file'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
  })

  test('Should respond with 200 and render the file upload form when uploadId is provided', async () => {
    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: '/guidance-documents/upload/file?uploadId=test-upload-id'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(payload).toContain('Upload your document')
    expect(payload).toContain('/upload-and-scan/test-upload-id')
  })
})
