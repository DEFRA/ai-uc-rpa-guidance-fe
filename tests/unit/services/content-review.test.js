import { vi, describe, test, expect, beforeEach } from 'vitest'

const mockListDocuments = vi.fn()
const mockStartReview = vi.fn()
const mockGetLatestReview = vi.fn()

vi.mock('../../../src/infra/api/guidance-api.js', () => ({
  listDocuments: mockListDocuments,
  startReview: mockStartReview,
  getLatestReview: mockGetLatestReview
}))

describe('content-review service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('#listReviewRuns', () => {
    let listReviewRuns

    beforeEach(async () => {
      vi.resetModules()
      ;({ listReviewRuns } = await import('../../../src/services/content-review.js'))
    })

    test('Should build runs from documents and their latest review', async () => {
      mockListDocuments.mockResolvedValueOnce({
        ok: true,
        data: { items: [{ id: 'doc-1', title: null, filename: 'guide.docx' }] }
      })
      mockGetLatestReview.mockResolvedValueOnce({
        ok: true,
        data: { jobId: 'job-abc', status: 'completed', updatedAt: '2026-06-29T10:00:00Z' }
      })

      const runs = await listReviewRuns()

      expect(runs).toEqual([
        {
          documentId: 'doc-1',
          title: 'guide.docx',
          status: 'completed',
          jobId: 'job-abc',
          updatedAt: '2026-06-29T10:00:00Z'
        }
      ])
    })

    test('Should map 404 from getLatestReview to status not_run', async () => {
      mockListDocuments.mockResolvedValueOnce({
        ok: true,
        data: { items: [{ id: 'doc-1', title: 'Guide', filename: null }] }
      })
      mockGetLatestReview.mockResolvedValueOnce({ ok: false, status: 404, data: null })

      const [run] = await listReviewRuns()
      expect(run).toMatchObject({ status: 'not_run', jobId: null, updatedAt: null })
    })
  })

  describe('#startReview', () => {
    let startReview

    beforeEach(async () => {
      vi.resetModules()
      ;({ startReview } = await import('../../../src/services/content-review.js'))
    })

    test('Should return a succeeded outcome with jobId on success', async () => {
      mockStartReview.mockResolvedValueOnce({ ok: true, data: { jobId: 'job-xyz' } })

      const result = await startReview('doc-1')
      expect(result.succeeded).toBe(true)
      expect(result.jobId).toBe('job-xyz')
    })

    test('Should return a failed outcome with reason conflict for 409', async () => {
      mockStartReview.mockResolvedValueOnce({ ok: false, status: 409, data: null })

      const result = await startReview('doc-1')
      expect(result.succeeded).toBe(false)
      expect(result.reason).toBe('conflict')
    })

    test('Should return a failed outcome with reason not_found for 404', async () => {
      mockStartReview.mockResolvedValueOnce({ ok: false, status: 404, data: null })

      const result = await startReview('doc-1')
      expect(result.succeeded).toBe(false)
      expect(result.reason).toBe('not_found')
    })

    test('Should propagate unexpected errors', async () => {
      mockStartReview.mockRejectedValueOnce(new Error('Network error'))

      await expect(startReview('doc-1')).rejects.toThrow('Network error')
    })
  })

  describe('#getReviewResults', () => {
    let getReviewResults

    beforeEach(async () => {
      vi.resetModules()
      ;({ getReviewResults } = await import('../../../src/services/content-review.js'))
    })

    test('Should return success with the critique result and resolved title', async () => {
      mockGetLatestReview.mockResolvedValueOnce({
        ok: true,
        data: {
          status: 'completed',
          result: { status: 'review_completed', reports: [{ standard: 'gds', findings: [] }] }
        }
      })
      mockListDocuments.mockResolvedValueOnce({
        ok: true,
        data: { items: [{ id: 'doc-1', title: null, filename: 'guide.docx' }] }
      })

      const outcome = await getReviewResults('doc-1')
      expect(outcome.succeeded).toBe(true)
      expect(outcome.result.documentTitle).toBe('guide.docx')
      expect(outcome.result.status).toBe('review_completed')
      expect(outcome.result.reports).toHaveLength(1)
    })

    test('Should return not_found when no review exists (404)', async () => {
      mockGetLatestReview.mockResolvedValueOnce({ ok: false, status: 404, data: null })

      const outcome = await getReviewResults('doc-1')
      expect(outcome.succeeded).toBe(false)
      expect(outcome.reason).toBe('not_found')
    })

    test('Should return not_found when the review has not finished (no result)', async () => {
      mockGetLatestReview.mockResolvedValueOnce({
        ok: true,
        data: { status: 'running', result: null }
      })

      const outcome = await getReviewResults('doc-1')
      expect(outcome.succeeded).toBe(false)
      expect(outcome.reason).toBe('not_found')
    })
  })
})
