import { constants as statusCodes } from 'node:http2'
import { vi } from 'vitest'

const { mockListDocuments, mockGetLatestReview, mockCreateFeedback, mockGetFeedbackForFinding } = vi.hoisted(() => ({
  mockListDocuments: vi.fn(),
  mockGetLatestReview: vi.fn(),
  mockCreateFeedback: vi.fn(),
  mockGetFeedbackForFinding: vi.fn()
}))

vi.mock('../../../../src/infra/api/guidance-api.js', () => ({
  listDocuments: mockListDocuments,
  startReview: vi.fn(),
  getLatestReview: mockGetLatestReview,
  createFeedback: mockCreateFeedback,
  getFeedbackForJob: vi.fn(),
  getFeedbackForFinding: mockGetFeedbackForFinding
}))

import { createServer } from '../../../../src/server/server.js'

const RESULT = {
  status: 'review_completed',
  reports: [
    {
      standard: 'gds',
      conformance_summary: 'Mostly conforms to GDS.',
      findings: [
        {
          rule_reference: 'GDS A11Y',
          what: 'Heading too long',
          where: 'Section 1',
          quote: 'A very long heading that rambles',
          why: 'Hard to scan',
          fix: 'Shorten it',
          severity: 'high'
        }
      ]
    },
    {
      standard: 'defra_style',
      conformance_summary: 'Consistent with DEFRA style.',
      findings: [
        {
          rule_reference: 'DEFRA style',
          what: "Expand 'SBI' on first use",
          where: 'Section 2',
          quote: 'the SBI must match',
          why: 'Acronyms should be expanded',
          fix: "Write 'single business identifier (SBI)'",
          severity: 'low'
        }
      ]
    }
  ],
  usage: { input_tokens: 10, output_tokens: 20 }
}

function mockReview () {
  mockGetLatestReview.mockResolvedValueOnce({
    ok: true,
    data: { status: 'completed', result: RESULT }
  })
  // getReviewResults resolves the document title from the document list.
  mockListDocuments.mockResolvedValueOnce({
    ok: true,
    data: { items: [{ id: 'doc-1', title: null, filename: 'guide.docx' }] }
  })
}

describe('#contentReviewResultsController', () => {
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

  describe('GET /content-review/{documentId}/results/v2', () => {
    test('Should render findings as grouped task-list links', async () => {
      mockReview()

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/content-review/doc-1/results/v2'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Guidance content review')
      expect(payload).toContain('Findings (2)')
      expect(payload).toContain('Important to fix')
      expect(payload).toContain('Suggestions')
      expect(payload).toContain('Heading too long')
      expect(payload).toContain('/content-review/doc-1/results/v2/0')
      // Conformance summary moved into the collapsed "What was checked" section.
      expect(payload).toContain('What was checked')
      expect(payload).toContain('GDS content standards')
    })

    test('Should 404 when no completed review exists', async () => {
      mockGetLatestReview.mockResolvedValueOnce({ ok: false, status: 404, data: null })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/content-review/doc-1/results/v2'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })
  })

  describe('GET /content-review/{documentId}/results/v2/{index}', () => {
    test('Should render the finding detail for a valid index', async () => {
      mockReview()

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/content-review/doc-1/results/v2/0'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Heading too long')
      expect(payload).toContain('In the document')
      expect(payload).toContain('Why it matters')
      expect(payload).toContain('Shorten it')
      expect(payload).toContain('Back to all findings')
    })

    test('Should 404 when the finding index is out of range', async () => {
      mockReview()

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/content-review/doc-1/results/v2/99'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })

    test('Should 404 when no review exists for the document', async () => {
      mockGetLatestReview.mockResolvedValueOnce({ ok: false, status: 404, data: null })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/content-review/doc-1/results/v2/0'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })
  })

  describe('POST /content-review/{documentId}/results/v2/{index}', () => {
    test('Should submit feedback and redirect back to the finding on success', async () => {
      mockReview()
      mockCreateFeedback.mockResolvedValueOnce({ ok: true, status: 201, data: { id: 'fb-1' } })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/content-review/doc-1/results/v2/0',
        payload: { verdict: 'fix' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe('/content-review/doc-1/results/v2/0')
      expect(mockCreateFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ agent: 'critic', findingIndex: 0, verdict: 'fix' })
      )
    })

    test('Should accept an optional comment alongside a wont_fix verdict', async () => {
      mockReview()
      mockCreateFeedback.mockResolvedValueOnce({ ok: true, status: 201, data: { id: 'fb-2' } })

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/content-review/doc-1/results/v2/0',
        payload: { verdict: 'wont_fix', comment: 'Not a priority right now' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(mockCreateFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ verdict: 'wont_fix', comment: 'Not a priority right now' })
      )
    })

    test('Should re-render with an error and 400 when verdict is missing or invalid', async () => {
      mockReview()

      const { statusCode, payload } = await server.inject({
        method: 'POST',
        url: '/content-review/doc-1/results/v2/0',
        payload: { verdict: 'not_a_real_verdict' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
      expect(payload).toContain('There is a problem')
      expect(payload).toContain('Select how this finding should be treated')
    })

    test('Should re-render with an error and 400 when the comment is too long', async () => {
      mockReview()

      const { statusCode, payload } = await server.inject({
        method: 'POST',
        url: '/content-review/doc-1/results/v2/0',
        payload: { verdict: 'wont_fix', comment: 'a'.repeat(501) }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
      expect(payload).toContain('There is a problem')
    })

    test('Should re-render the finding with a notice and 409 when feedback already exists', async () => {
      mockReview()
      mockCreateFeedback.mockResolvedValueOnce({ ok: false, status: 409, data: null })
      mockGetFeedbackForFinding.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { verdict: 'fix', comment: null }
      })

      const { statusCode, payload } = await server.inject({
        method: 'POST',
        url: '/content-review/doc-1/results/v2/0',
        payload: { verdict: 'fix' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_CONFLICT)
      expect(payload).toContain('Feedback has already been submitted for this finding')
    })
  })
})
