import { constants as statusCodes } from 'node:http2'

import { createServer } from '../../../../src/server/server.js'

describe('#confirmationController', () => {
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
      url: '/publishing-checks/confirmation?jobId=job-abc'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(payload).toContain('Publishing check started')
  })

  test('Should display the job reference', async () => {
    const { payload } = await server.inject({
      method: 'GET',
      url: '/publishing-checks/confirmation?jobId=job-abc'
    })

    expect(payload).toContain('job-abc')
  })

  test('Should contain a link to the publishing checks status page', async () => {
    const { payload } = await server.inject({
      method: 'GET',
      url: '/publishing-checks/confirmation?jobId=job-abc'
    })

    expect(payload).toContain('/publishing-checks')
    expect(payload).toContain('View publishing checks')
  })
})
