import { constants as statusCodes } from 'node:http2'

import { createServer } from '../../../../src/server/server.js'

describe('#guidanceDocumentsListController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should respond with 200 and render the guidance documents list page', async () => {
    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: '/guidance-documents'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(payload).toContain('Guidance documents')
  })

  test('Should contain a link to upload a guidance document', async () => {
    const { payload } = await server.inject({
      method: 'GET',
      url: '/guidance-documents'
    })

    expect(payload).toContain('/guidance-documents/upload')
  })
})
