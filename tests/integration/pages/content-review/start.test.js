import { constants as statusCodes } from 'node:http2'
import { vi } from 'vitest'

const { mockListDocuments, mockStartReview, mockGetLatestReview } = vi.hoisted(() => ({
  mockListDocuments: vi.fn(),
  mockStartReview: vi.fn(),
  mockGetLatestReview: vi.fn()
}))

vi.mock('../../../../src/infra/api/guidance-api.js', () => ({
  listDocuments: mockListDocuments,
  startReview: mockStartReview,
  getLatestReview: mockGetLatestReview
}))

import { createServer } from '../../../../src/server/server.js'

describe('#contentReviewController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /content-review (status)', () => {
    test('Should list documents with their review status', async () => {
      mockListDocuments.mockResolvedValueOnce({
        ok: true,
        data: { items: [{ id: 'doc-1', title: null, filename: 'guide.docx' }] }
      })
      mockGetLatestReview.mockResolvedValueOnce({
        ok: true,
        data: { jobId: 'job-1', status: 'completed', updatedAt: '2026-06-29T10:00:00Z' }
      })

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/content-review'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Content review')
      expect(payload).toContain('guide.docx')
      expect(payload).toContain('Completed')
    })
  })

  describe('GET /content-review/start', () => {
    test('Should render the document select when complete documents exist', async () => {
      mockListDocuments.mockResolvedValueOnce({
        ok: true,
        data: { items: [{ id: 'doc-1', title: 'Guide A', status: 'complete' }] }
      })

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/content-review/start'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Start a content review')
      expect(payload).toContain('Guide A')
    })
  })

  describe('POST /content-review/start', () => {
    test('Should redirect to confirmation with jobId on success', async () => {
      mockStartReview.mockResolvedValueOnce({
        ok: true,
        data: { jobId: 'job-999', status: 'pending' }
      })

      // Include the hidden _csrf field the browser form posts, to guard
      // against strict validation rejecting the unknown key.
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/content-review/start',
        payload: { documentId: 'doc-1', _csrf: '' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe('/content-review/confirmation?jobId=job-999')
    })

    test('Should re-render with error and 400 when no document selected', async () => {
      mockListDocuments.mockResolvedValueOnce({ ok: true, data: { items: [] } })

      const { statusCode, payload } = await server.inject({
        method: 'POST',
        url: '/content-review/start',
        payload: { documentId: '' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
      expect(payload).toContain('There is a problem')
      expect(payload).toContain('Select a document to review')
    })

    test('Should re-render with conflict error when the document is not ready', async () => {
      mockStartReview.mockResolvedValueOnce({ ok: false, status: 409, data: null })
      mockListDocuments.mockResolvedValueOnce({ ok: true, data: { items: [] } })

      const { statusCode, payload } = await server.inject({
        method: 'POST',
        url: '/content-review/start',
        payload: { documentId: 'doc-1' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('This document has not been fully processed yet')
    })
  })

  describe('GET /content-review/{documentId}/results', () => {
    test('Should render the critique reports on success', async () => {
      mockGetLatestReview.mockResolvedValueOnce({
        ok: true,
        data: {
          status: 'completed',
          result: {
            status: 'review_completed',
            reports: [{
              standard: 'gds',
              conformance_summary: 'Mostly conforms.',
              findings: [{
                rule_reference: 'GDS A11Y',
                what: 'Heading too long',
                where: 'Section 1',
                quote: 'A very long heading',
                why: 'Hard to scan',
                fix: 'Shorten it',
                severity: 'medium'
              }]
            }],
            usage: { input_tokens: 10, output_tokens: 20 }
          }
        }
      })
      mockListDocuments.mockResolvedValueOnce({
        ok: true,
        data: { items: [{ id: 'doc-1', title: null, filename: 'guide.docx' }] }
      })

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/content-review/doc-1/results'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Guidance content review')
      expect(payload).toContain('GDS content standards')
      expect(payload).toContain('Heading too long')
    })

    test('Should 404 when no completed review exists', async () => {
      mockGetLatestReview.mockResolvedValueOnce({ ok: false, status: 404, data: null })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/content-review/doc-1/results'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })
  })
})
