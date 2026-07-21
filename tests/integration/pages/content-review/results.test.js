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
  status: 'completed',
  document_title: 'Claims processing guide',
  task_context: {
    task: 'Process a customer claim',
    user: 'A claims processor',
    usage_context: 'Used live on calls, under time pressure'
  },
  usability: {
    verdict: 'partly',
    explanation: 'Key decisions are unclear in places.'
  },
  principle_ratings: {
    clear_purpose: 'fully_applied',
    starts_with_the_reader: 'partly_applied',
    task_focused_structure: 'partly_applied',
    plain_english: 'partly_applied',
    multiple_formats: 'partly_applied',
    decision_led: 'not_applied',
    scan_friendly: 'partly_applied',
    accessible_by_default: 'partly_applied',
    consistent: 'partly_applied',
    usable_under_pressure: 'partly_applied'
  },
  good_points: [
    {
      principle: 'scan_friendly',
      quote: 'Step 1: open the case',
      comment: 'Clear action-led step'
    }
  ],
  findings: [
    {
      principle: 'plain_english',
      section: 'Section 1',
      quote: 'A very long heading that rambles',
      issue: 'Heading too long',
      why_it_matters: 'Hard to scan',
      severity: 'high',
      confidence: 'high',
      recommendation: 'Shorten it'
    },
    {
      principle: 'consistent',
      section: 'Section 2',
      quote: 'the SBI must match',
      issue: "Expand 'SBI' on first use",
      why_it_matters: 'Acronyms should be expanded',
      severity: 'low',
      confidence: 'moderate',
      recommendation: "Write 'single business identifier (SBI)'"
    }
  ],
  usage: { input_tokens: 10, output_tokens: 20 }
}

function mockReview (result = RESULT) {
  mockGetLatestReview.mockResolvedValueOnce({
    ok: true,
    data: { jobId: 'job-1', status: 'completed', result }
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

  describe('GET /content-review/{documentId}/results', () => {
    test('Should render the usability verdict, context, and ratings', async () => {
      mockReview()

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/content-review/doc-1/results'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Guidance content review')
      expect(payload).toContain('Claims processing guide')
      expect(payload).toContain('Partly passes the usability test')
      expect(payload).toContain('Task and user context')
      expect(payload).toContain('A claims processor')
      expect(payload).toContain('Used live on calls, under time pressure')
      expect(payload).toContain('Principle ratings')
      expect(payload).toContain('Plain English')
      expect(payload).toContain('Fully applied')
      expect(payload).toContain('Not applied')
    })

    test('Should render findings and ratings in separate tabs', async () => {
      mockReview()

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/content-review/doc-1/results'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('govuk-tabs')
      expect(payload).toContain('id="findings"')
      expect(payload).toContain('id="principle-ratings"')
    })

    test('Should render findings as grouped task-list links', async () => {
      mockReview()

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/content-review/doc-1/results'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Findings (2)')
      expect(payload).toContain('Important to fix')
      expect(payload).toContain('Suggestions')
      expect(payload).toContain('Heading too long')
      expect(payload).toContain('/content-review/doc-1/results/0')
    })

    test('Should render good points', async () => {
      mockReview()

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/content-review/doc-1/results'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('What the guidance does well')
      expect(payload).toContain('Step 1: open the case')
    })

    test('Should render a success banner when the usability verdict is yes', async () => {
      mockReview({
        ...RESULT,
        usability: { verdict: 'yes', explanation: 'Fully supports the task.' }
      })

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/content-review/doc-1/results'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Passes the usability test')
    })

    test('Should render an alert banner when the usability verdict is no', async () => {
      mockReview({
        ...RESULT,
        usability: { verdict: 'no', explanation: 'The task breaks down at step 3.' }
      })

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/content-review/doc-1/results'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Does not pass the usability test')
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

  describe('GET /content-review/{documentId}/results/{index}', () => {
    test('Should render the finding detail for a valid index', async () => {
      mockReview()

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/content-review/doc-1/results/0'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Heading too long')
      expect(payload).toContain('Principle')
      expect(payload).toContain('Plain English')
      expect(payload).toContain('In the document')
      expect(payload).toContain('Why it matters')
      expect(payload).toContain('Shorten it')
      expect(payload).toContain('Confidence')
      expect(payload).toContain('Back to all findings')
    })

    test('Should use a stable heading and render a long issue in full as the lede', async () => {
      const longIssue =
        'The No branch instructs the processor to skip to Decision update ' +
        'and closure, bypassing Sections 4 and 5 entirely, which is a logic error.'
      mockReview({
        ...RESULT,
        findings: [{ ...RESULT.findings[0], issue: longIssue }]
      })

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/content-review/doc-1/results/0'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      // The h1 is the stable label; the document title is the caption and
      // the full issue text renders as the lede paragraph, untruncated.
      expect(payload).toContain('Finding 1 of 1')
      expect(payload).toContain('Claims processing guide')
      expect(payload).toContain(longIssue)
    })

    test('Should 404 when the finding index is out of range', async () => {
      mockReview()

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/content-review/doc-1/results/99'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })

    test('Should 404 when no review exists for the document', async () => {
      mockGetLatestReview.mockResolvedValueOnce({ ok: false, status: 404, data: null })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/content-review/doc-1/results/0'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })
  })

  describe('POST /content-review/{documentId}/results/{index}', () => {
    test('Should submit feedback and redirect back to the finding on success', async () => {
      mockReview()
      mockCreateFeedback.mockResolvedValueOnce({ ok: true, status: 201, data: { id: 'fb-1' } })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/content-review/doc-1/results/0',
        payload: { verdict: 'fix' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe('/content-review/doc-1/results/0')
      expect(mockCreateFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ agent: 'reviewer', findingIndex: 0, verdict: 'fix' })
      )
    })

    test('Should accept an optional comment alongside a wont_fix verdict', async () => {
      mockReview()
      mockCreateFeedback.mockResolvedValueOnce({ ok: true, status: 201, data: { id: 'fb-2' } })

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/content-review/doc-1/results/0',
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
        url: '/content-review/doc-1/results/0',
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
        url: '/content-review/doc-1/results/0',
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
        url: '/content-review/doc-1/results/0',
        payload: { verdict: 'fix' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_CONFLICT)
      expect(payload).toContain('Feedback has already been submitted for this finding')
    })

    test('Should 404 when no review exists for the document', async () => {
      mockGetLatestReview.mockResolvedValueOnce({ ok: false, status: 404, data: null })

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/content-review/doc-1/results/0',
        payload: { verdict: 'fix' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })

    test('Should 404 when feedback already exists but the finding index is out of range', async () => {
      mockReview()
      mockCreateFeedback.mockResolvedValueOnce({ ok: false, status: 409, data: null })

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/content-review/doc-1/results/99',
        payload: { verdict: 'fix' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })

    test('Should 404 when the payload is invalid and no review exists for the document', async () => {
      mockGetLatestReview.mockResolvedValueOnce({ ok: false, status: 404, data: null })

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/content-review/doc-1/results/0',
        payload: { verdict: 'not_a_real_verdict' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })

    test('Should 404 when the payload is invalid and the finding index is out of range', async () => {
      mockReview()

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/content-review/doc-1/results/99',
        payload: { verdict: 'not_a_real_verdict' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })
  })
})
