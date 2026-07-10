import { constants as statusCodes } from 'node:http2'
import { vi } from 'vitest'

const { mockGetLatestAnalysis, mockCreateFeedback, mockGetFeedbackForFinding } = vi.hoisted(() => ({
  mockGetLatestAnalysis: vi.fn(),
  mockCreateFeedback: vi.fn(),
  mockGetFeedbackForFinding: vi.fn()
}))

vi.mock('../../../../src/infra/api/guidance-api.js', () => ({
  listDocuments: vi.fn(),
  startAnalysis: vi.fn(),
  getLatestAnalysis: mockGetLatestAnalysis,
  createFeedback: mockCreateFeedback,
  getFeedbackForJob: vi.fn(),
  getFeedbackForFinding: mockGetFeedbackForFinding
}))

import { createServer } from '../../../../src/server/server.js'

const FINDINGS = [
  {
    severity: 'low',
    category: 'Accessibility',
    section: 'Section 3',
    issue: 'Low contrast text',
    why_it_matters: 'Hard to read for some users.',
    recommendation: 'Increase the contrast ratio.'
  },
  {
    severity: 'critical',
    category: 'Accessibility',
    section: 'Section 1',
    issue: 'Missing alt text',
    why_it_matters: 'Screen readers cannot describe the image.',
    recommendation: 'Add descriptive alt text.'
  }
]

function resultWith (findings) {
  return {
    ok: true,
    data: {
      jobId: 'job-1',
      result: {
        document_title: 'RPA Guidance',
        verdict: 'not_ready',
        summary: 'Issues were found.',
        findings,
        good_points: ['Clear headings']
      }
    }
  }
}

describe('#publishingCheckResultsController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    mockGetFeedbackForFinding.mockResolvedValue({ ok: false, status: 404, data: null })
  })

  describe('GET /publishing-checks/{documentId}/results/v2', () => {
    test('Should render the results page with the document title', async () => {
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
        url: '/publishing-checks/doc-1/results/v2'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('RPA Guidance')
    })

    test('Should render findings as grouped task-list links to detail pages', async () => {
      mockGetLatestAnalysis.mockResolvedValueOnce(resultWith(FINDINGS))

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/publishing-checks/doc-1/results/v2'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Findings (2)')
      expect(payload).toContain('Important to fix')
      expect(payload).toContain('Suggestions')
      expect(payload).toContain('Missing alt text')
      // Each finding links into its own detail page by stable index.
      expect(payload).toContain('/publishing-checks/doc-1/results/v2/1')
    })

    test('Should return 404 when no analysis is found for the document', async () => {
      mockGetLatestAnalysis.mockResolvedValueOnce({ ok: false, status: 404, data: null })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/publishing-checks/doc-1/results/v2'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })

    test('Should render an error page when the API throws unexpectedly', async () => {
      mockGetLatestAnalysis.mockRejectedValueOnce(new Error('API down'))

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/publishing-checks/doc-1/results/v2'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR)
    })
  })

  describe('GET /publishing-checks/{documentId}/results/v2/{index}', () => {
    test('Should render the finding detail for a valid index', async () => {
      mockGetLatestAnalysis.mockResolvedValueOnce(resultWith(FINDINGS))

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/publishing-checks/doc-1/results/v2/0'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      // Index 0 is the first finding in the original (un-sorted) order.
      expect(payload).toContain('Low contrast text')
      expect(payload).toContain('Why it matters')
      expect(payload).toContain('Increase the contrast ratio.')
      expect(payload).toContain('Back to all findings')
    })

    test('Should 404 when the finding index is out of range', async () => {
      mockGetLatestAnalysis.mockResolvedValueOnce(resultWith(FINDINGS))

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/publishing-checks/doc-1/results/v2/99'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })

    test('Should 404 when no analysis exists for the document', async () => {
      mockGetLatestAnalysis.mockResolvedValueOnce({ ok: false, status: 404, data: null })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/publishing-checks/doc-1/results/v2/0'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })
  })

  describe('POST /publishing-checks/{documentId}/results/v2/{index}', () => {
    test('Should submit feedback and redirect back to the finding on success', async () => {
      mockGetLatestAnalysis.mockResolvedValueOnce(resultWith(FINDINGS))
      mockCreateFeedback.mockResolvedValueOnce({ ok: true, status: 201, data: { id: 'fb-1' } })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/publishing-checks/doc-1/results/v2/0',
        payload: { verdict: 'fix' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe('/publishing-checks/doc-1/results/v2/0')
      expect(mockCreateFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ agent: 'checker', findingIndex: 0, verdict: 'fix' })
      )
    })

    test('Should accept an optional comment alongside a false_positive verdict', async () => {
      mockGetLatestAnalysis.mockResolvedValueOnce(resultWith(FINDINGS))
      mockCreateFeedback.mockResolvedValueOnce({ ok: true, status: 201, data: { id: 'fb-2' } })

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/publishing-checks/doc-1/results/v2/0',
        payload: { verdict: 'false_positive', comment: 'This does not apply here' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(mockCreateFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ verdict: 'false_positive', comment: 'This does not apply here' })
      )
    })

    test('Should re-render with an error and 400 when verdict is missing or invalid', async () => {
      mockGetLatestAnalysis.mockResolvedValueOnce(resultWith(FINDINGS))

      const { statusCode, payload } = await server.inject({
        method: 'POST',
        url: '/publishing-checks/doc-1/results/v2/0',
        payload: { verdict: 'not_a_real_verdict' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
      expect(payload).toContain('There is a problem')
      expect(payload).toContain('Select how this finding should be treated')
    })

    test('Should re-render with an error and 400 when the comment is too long', async () => {
      mockGetLatestAnalysis.mockResolvedValueOnce(resultWith(FINDINGS))

      const { statusCode, payload } = await server.inject({
        method: 'POST',
        url: '/publishing-checks/doc-1/results/v2/0',
        payload: { verdict: 'wont_fix', comment: 'a'.repeat(501) }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
      expect(payload).toContain('There is a problem')
    })

    test('Should re-render the finding with a notice and 409 when feedback already exists', async () => {
      mockGetLatestAnalysis.mockResolvedValueOnce(resultWith(FINDINGS))
      mockCreateFeedback.mockResolvedValueOnce({ ok: false, status: 409, data: null })
      mockGetFeedbackForFinding.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { verdict: 'fix', comment: null }
      })

      const { statusCode, payload } = await server.inject({
        method: 'POST',
        url: '/publishing-checks/doc-1/results/v2/0',
        payload: { verdict: 'fix' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_CONFLICT)
      expect(payload).toContain('Feedback has already been submitted for this finding')
    })
  })
})
