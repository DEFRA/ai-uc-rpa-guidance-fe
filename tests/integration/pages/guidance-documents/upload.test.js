import { constants as statusCodes } from 'node:http2'
import { vi } from 'vitest'

const { mockInitiateUpload } = vi.hoisted(() => ({
  mockInitiateUpload: vi.fn()
}))

vi.mock('../../../../src/infra/api/guidance-documents.js', () => ({
  initiateUpload: mockInitiateUpload
}))

import { createServer } from '../../../../src/server/server.js'

describe('#guidanceDocumentsUploadController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /guidance-documents/upload', () => {
    test('Should respond with 200 and render the upload info page', async () => {
      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/guidance-documents/upload'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Upload a guidance document')
    })

    test('Should contain the start upload button', async () => {
      const { payload } = await server.inject({
        method: 'GET',
        url: '/guidance-documents/upload'
      })

      expect(payload).toContain('Start upload')
    })
  })

  describe('POST /guidance-documents/upload', () => {
    test('Should call the guidance API and redirect to the file upload page with uploadId', async () => {
      mockInitiateUpload.mockResolvedValueOnce({ uploadId: 'test-upload-id' })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/guidance-documents/upload',
        payload: {}
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe('/guidance-documents/upload/file?uploadId=test-upload-id')
    })

    test('Should return 500 when the guidance API fails', async () => {
      mockInitiateUpload.mockRejectedValueOnce(new Error('Guidance API unavailable'))

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/guidance-documents/upload',
        payload: {}
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR)
    })
  })
})
