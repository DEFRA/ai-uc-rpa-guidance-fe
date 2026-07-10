import { vi, describe, test, expect, beforeEach } from 'vitest'

const mockCreateFeedback = vi.fn()
const mockGetFeedbackForFinding = vi.fn()

vi.mock('../../../src/infra/api/guidance-api.js', () => ({
  createFeedback: mockCreateFeedback,
  getFeedbackForFinding: mockGetFeedbackForFinding
}))

describe('feedback service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('#submitFeedback', () => {
    let submitFeedback

    beforeEach(async () => {
      vi.resetModules()
      ;({ submitFeedback } = await import('../../../src/services/feedback.js'))
    })

    test('Should return ok:true on successful submission', async () => {
      mockCreateFeedback.mockResolvedValueOnce({ ok: true, status: 201, data: { id: 'fb-1' } })

      const result = await submitFeedback({
        jobId: 'job-abc',
        agent: 'checker',
        findingIndex: 0,
        verdict: 'fix',
        comment: 'Needs attention'
      })

      expect(result.ok).toBe(true)
      expect(result.alreadySubmitted).toBe(false)
    })

    test('Should return alreadySubmitted:true on 409', async () => {
      mockCreateFeedback.mockResolvedValueOnce({ ok: false, status: 409, data: null })

      const result = await submitFeedback({
        jobId: 'job-abc',
        agent: 'checker',
        findingIndex: 0,
        verdict: 'fix'
      })

      expect(result.ok).toBe(false)
      expect(result.alreadySubmitted).toBe(true)
    })

    test('Should propagate unexpected errors', async () => {
      mockCreateFeedback.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        submitFeedback({ jobId: 'job-abc', agent: 'checker', findingIndex: 0, verdict: 'fix' })
      ).rejects.toThrow('Network error')
    })
  })

  describe('#getFindingFeedback', () => {
    let getFindingFeedback

    beforeEach(async () => {
      vi.resetModules()
      ;({ getFindingFeedback } = await import('../../../src/services/feedback.js'))
    })

    test('Should return feedback data when found', async () => {
      const feedbackData = { id: 'fb-1', verdict: 'fix', comment: 'Fix this' }
      mockGetFeedbackForFinding.mockResolvedValueOnce({ ok: true, data: feedbackData })

      const result = await getFindingFeedback('job-abc', 0)
      expect(result).toEqual(feedbackData)
    })

    test('Should return null when no feedback exists (404)', async () => {
      mockGetFeedbackForFinding.mockResolvedValueOnce({ ok: false, status: 404, data: null })

      const result = await getFindingFeedback('job-abc', 0)
      expect(result).toBeNull()
    })

    test('Should propagate unexpected errors', async () => {
      mockGetFeedbackForFinding.mockRejectedValueOnce(new Error('Network error'))

      await expect(getFindingFeedback('job-abc', 0)).rejects.toThrow('Network error')
    })
  })
})
