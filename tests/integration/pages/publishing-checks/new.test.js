import { constants as statusCodes } from 'node:http2'
import { vi } from 'vitest'

const { mockListDocuments } = vi.hoisted(() => ({
  mockListDocuments: vi.fn()
}))

const { mockStartAnalysis } = vi.hoisted(() => ({
  mockStartAnalysis: vi.fn()
}))

vi.mock('../../../../src/infra/api/guidance-documents.js', () => ({
  listDocuments: mockListDocuments
}))

vi.mock('../../../../src/infra/api/publishing-jobs.js', () => ({
  startAnalysis: mockStartAnalysis,
  getLatestAnalysis: vi.fn(),
  getJob: vi.fn()
}))

import { createServer } from '../../../../src/server/server.js'

describe('#newCheckController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /publishing-checks/start', () => {
    test('Should respond with 200 and render the new check page', async () => {
      mockListDocuments.mockResolvedValueOnce({ items: [] })

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/publishing-checks/start'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Start a publishing check')
    })

    test('Should show empty state when no documents are available', async () => {
      mockListDocuments.mockResolvedValueOnce({ items: [] })

      const { payload } = await server.inject({
        method: 'GET',
        url: '/publishing-checks/start'
      })

      expect(payload).toContain('No parsed documents are available')
    })

    test('Should render select when complete documents exist', async () => {
      mockListDocuments.mockResolvedValueOnce({
        items: [
          { id: 'doc-1', title: 'Guide A', status: 'complete' }
        ]
      })

      const { payload } = await server.inject({
        method: 'GET',
        url: '/publishing-checks/start'
      })

      expect(payload).toContain('Guide A')
      expect(payload).toContain('Start publishing check')
    })
  })

  describe('POST /publishing-checks/start', () => {
    test('Should redirect to confirmation page with jobId on success', async () => {
      mockListDocuments.mockResolvedValue({ items: [] })
      mockStartAnalysis.mockResolvedValueOnce({
        jobId: 'job-999',
        status: 'pending'
      })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/publishing-checks/start',
        payload: { documentId: 'doc-1' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe(
        '/publishing-checks/confirmation?jobId=job-999'
      )
    })

    test('Should re-render with error when no document selected', async () => {
      mockListDocuments.mockResolvedValueOnce({ items: [] })

      const { statusCode, payload } = await server.inject({
        method: 'POST',
        url: '/publishing-checks/start',
        payload: { documentId: '' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('There is a problem')
      expect(payload).toContain('Select a document to analyse')
    })
  })
})
