import { constants as statusCodes } from 'node:http2'
import { vi } from 'vitest'

const { mockListDocuments } = vi.hoisted(() => ({
  mockListDocuments: vi.fn()
}))

const { mockGetLatestAnalysis } = vi.hoisted(() => ({
  mockGetLatestAnalysis: vi.fn()
}))

vi.mock('../../../../src/infra/api/guidance-api.js', () => ({
  listDocuments: mockListDocuments,
  getLatestAnalysis: mockGetLatestAnalysis,
  startAnalysis: vi.fn()
}))

import { createServer } from '../../../../src/server/server.js'

describe('#publishingChecksStatusController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should respond with 200 and render the status page', async () => {
    mockListDocuments.mockResolvedValueOnce({ ok: true, data: { items: [] } })

    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: '/publishing-checks'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(payload).toContain('Publishing checks')
  })

  test('Should render a link to start a new publishing check', async () => {
    mockListDocuments.mockResolvedValueOnce({ ok: true, data: { items: [] } })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/publishing-checks'
    })

    expect(payload).toContain('/publishing-checks/start')
  })

  test('Should show disabled View button for non-completed runs', async () => {
    mockListDocuments.mockResolvedValueOnce({
      ok: true,
      data: { items: [{ id: 'doc-1', title: 'Guide', status: 'complete' }] }
    })
    mockGetLatestAnalysis.mockResolvedValueOnce({
      ok: true,
      data: { jobId: 'job-1', status: 'pending', updatedAt: '2026-06-15T10:00:00Z' }
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/publishing-checks'
    })

    expect(payload).toContain('aria-disabled="true"')
    expect(payload).toContain('disabled')
  })

  test('Should show enabled View link for completed runs', async () => {
    mockListDocuments.mockResolvedValueOnce({
      ok: true,
      data: { items: [{ id: 'doc-1', title: 'Guide', status: 'complete' }] }
    })
    mockGetLatestAnalysis.mockResolvedValueOnce({
      ok: true,
      data: { jobId: 'job-1', status: 'completed', updatedAt: '2026-06-15T10:00:00Z' }
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/publishing-checks'
    })

    expect(payload).toContain('href="/publishing-checks/doc-1/results"')
    expect(payload).not.toContain('aria-disabled="true"')
  })

  test('Should render error page when the API is unavailable', async () => {
    mockListDocuments.mockRejectedValueOnce(new Error('API down'))

    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/publishing-checks'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR)
  })
})
