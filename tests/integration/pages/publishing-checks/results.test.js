import { constants as statusCodes } from 'node:http2'
import { vi } from 'vitest'

const { mockGetLatestAnalysis } = vi.hoisted(() => ({
  mockGetLatestAnalysis: vi.fn()
}))

vi.mock('../../../../src/infra/api/guidance-api.js', () => ({
  listDocuments: vi.fn(),
  startAnalysis: vi.fn(),
  getLatestAnalysis: mockGetLatestAnalysis
}))

import { createServer } from '../../../../src/server/server.js'

describe('#publishingCheckResultsController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /publishing-checks/{documentId}/results', () => {
    test('Should respond with 200 and render the results page on success', async () => {
      mockGetLatestAnalysis.mockResolvedValueOnce({
        ok: true,
        data: {
          result: {
            document_title: 'RPA Guidance',
            verdict: 'ready',
            summary: 'Document is ready to publish.',
            findings: [],
            good_points: []
          }
        }
      })

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/publishing-checks/doc-1/results'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('RPA Guidance')
    })

    test('Should render findings when the result contains findings', async () => {
      mockGetLatestAnalysis.mockResolvedValueOnce({
        ok: true,
        data: {
          result: {
            document_title: 'RPA Guidance',
            verdict: 'not_ready',
            summary: 'Issues were found.',
            findings: [
              {
                severity: 'high',
                category: 'Accessibility',
                title: 'Missing alt text',
                description: 'Images are missing alt attributes.'
              }
            ],
            good_points: []
          }
        }
      })

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/publishing-checks/doc-1/results'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Findings')
    })

    test('Should group findings by category and show worst severity', async () => {
      mockGetLatestAnalysis.mockResolvedValueOnce({
        ok: true,
        data: {
          result: {
            document_title: 'RPA Guidance',
            verdict: 'not_ready',
            summary: 'Multiple issues found.',
            findings: [
              {
                severity: 'low',
                category: 'Accessibility',
                title: 'Low contrast text',
                description: 'Text contrast is low.'
              },
              {
                severity: 'critical',
                category: 'Accessibility',
                title: 'Missing alt text',
                description: 'Images are missing alt attributes.'
              },
              {
                severity: 'medium',
                category: 'Security',
                title: 'XSS vulnerability',
                description: 'Input not sanitized.'
              }
            ],
            good_points: []
          }
        }
      })

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/publishing-checks/doc-1/results'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Accessibility')
      expect(payload).toContain('Security')
      expect(payload).toContain('critical')
    })

    test('Should handle findings without a category', async () => {
      mockGetLatestAnalysis.mockResolvedValueOnce({
        ok: true,
        data: {
          result: {
            document_title: 'RPA Guidance',
            verdict: 'not_ready',
            summary: 'Issues found.',
            findings: [
              {
                severity: 'high',
                title: 'General issue',
                description: 'No category provided.'
              }
            ],
            good_points: []
          }
        }
      })

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/publishing-checks/doc-1/results'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Uncategorised')
    })

    test('Should return 404 when no analysis is found for the document', async () => {
      mockGetLatestAnalysis.mockResolvedValueOnce({
        ok: false,
        status: 404,
        data: null
      })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/publishing-checks/doc-1/results'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })

    test('Should render an error page when the API throws unexpectedly', async () => {
      mockGetLatestAnalysis.mockRejectedValueOnce(new Error('API down'))

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/publishing-checks/doc-1/results'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR)
    })
  })
})
