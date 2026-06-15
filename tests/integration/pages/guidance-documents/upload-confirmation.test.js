import { constants as statusCodes } from 'node:http2'

import { createServer } from '../../../../src/server/server.js'

describe('#guidanceDocumentsUploadConfirmationController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should respond with 200 and render the confirmation page', async () => {
    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: '/guidance-documents/upload/confirmation'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(payload).toContain('Document uploaded')
  })

  test('Should show the uploadId from the query param', async () => {
    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: '/guidance-documents/upload/confirmation?uploadId=confirm-test-id'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(payload).toContain('confirm-test-id')
  })

  test('Should contain a link back to the guidance documents list', async () => {
    const { payload } = await server.inject({
      method: 'GET',
      url: '/guidance-documents/upload/confirmation'
    })

    expect(payload).toContain('/guidance-documents')
  })
})
