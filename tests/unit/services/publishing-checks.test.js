import { vi, describe, test, expect, beforeEach } from 'vitest'

const mockListDocuments = vi.fn()
const mockGetLatestAnalysis = vi.fn()
const mockStartAnalysis = vi.fn()

vi.mock('../../../src/infra/api/guidance-documents.js', () => ({
  listDocuments: mockListDocuments
}))

vi.mock('../../../src/infra/api/publishing-jobs.js', () => ({
  getLatestAnalysis: mockGetLatestAnalysis,
  startAnalysis: mockStartAnalysis
}))

describe('publishing-checks service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('#getCheckResults', () => {
    let getCheckResults

    beforeEach(async () => {
      vi.resetModules()
      ;({ getCheckResults } = await import('../../../src/services/publishing-checks.js'))
    })

    test('Should return a succeeded outcome with result on success', async () => {
      const mockResult = { verdict: 'ready', document_title: 'Guide', findings: [] }
      mockGetLatestAnalysis.mockResolvedValueOnce({ result: mockResult })

      const outcome = await getCheckResults('doc-1')
      expect(outcome.succeeded).toBe(true)
      expect(outcome.result).toEqual(mockResult)
    })

    test('Should return a failed outcome with reason not_found for 404', async () => {
      mockGetLatestAnalysis.mockRejectedValueOnce(Object.assign(new Error('Not found'), { statusCode: 404 }))

      const outcome = await getCheckResults('doc-1')
      expect(outcome.succeeded).toBe(false)
      expect(outcome.reason).toBe('not_found')
    })

    test('Should propagate unexpected errors', async () => {
      mockGetLatestAnalysis.mockRejectedValueOnce(new Error('Network error'))

      await expect(getCheckResults('doc-1')).rejects.toThrow('Network error')
    })
  })

  describe('#listCheckRuns', () => {
    let listCheckRuns

    beforeEach(async () => {
      vi.resetModules()
      ;({ listCheckRuns } = await import('../../../src/services/publishing-checks.js'))
    })

    test('Should build runs from documents and their latest analysis', async () => {
      mockListDocuments.mockResolvedValueOnce({
        items: [{ id: 'doc-1', title: 'RPA Guide', filename: null }]
      })
      mockGetLatestAnalysis.mockResolvedValueOnce({
        jobId: 'job-abc',
        status: 'completed',
        updatedAt: '2026-06-15T10:00:00Z'
      })

      const runs = await listCheckRuns()

      expect(runs).toEqual([
        {
          documentId: 'doc-1',
          title: 'RPA Guide',
          status: 'completed',
          jobId: 'job-abc',
          updatedAt: '2026-06-15T10:00:00Z'
        }
      ])
    })

    test('Should use filename when title is absent', async () => {
      mockListDocuments.mockResolvedValueOnce({
        items: [{ id: 'doc-1', title: null, filename: 'guide.docx' }]
      })
      mockGetLatestAnalysis.mockResolvedValueOnce({ jobId: 'j', status: 'completed', updatedAt: null })

      const [run] = await listCheckRuns()
      expect(run.title).toBe('guide.docx')
    })

    test('Should fall back to "Untitled" when neither title nor filename', async () => {
      mockListDocuments.mockResolvedValueOnce({
        items: [{ id: 'doc-1', title: null, filename: null }]
      })
      mockGetLatestAnalysis.mockResolvedValueOnce({ jobId: 'j', status: 'completed', updatedAt: null })

      const [run] = await listCheckRuns()
      expect(run.title).toBe('Untitled')
    })

    test('Should map 404 from getLatestAnalysis to status not_run', async () => {
      mockListDocuments.mockResolvedValueOnce({
        items: [{ id: 'doc-1', title: 'Guide', filename: null }]
      })
      mockGetLatestAnalysis.mockRejectedValueOnce(
        Object.assign(new Error('Not Found'), { statusCode: 404 })
      )

      const [run] = await listCheckRuns()
      expect(run).toMatchObject({ status: 'not_run', jobId: null, updatedAt: null })
    })

    test('Should degrade per-document unexpected failure to status error', async () => {
      mockListDocuments.mockResolvedValueOnce({
        items: [{ id: 'doc-1', title: 'Guide', filename: null }]
      })
      mockGetLatestAnalysis.mockRejectedValueOnce(new Error('Server error'))

      const [run] = await listCheckRuns()
      expect(run.status).toBe('error')
    })

    test('Should surface top-level listDocuments failure', async () => {
      mockListDocuments.mockRejectedValueOnce(new Error('API down'))

      await expect(listCheckRuns()).rejects.toThrow('API down')
    })
  })

  describe('#startCheck', () => {
    let startCheck

    beforeEach(async () => {
      vi.resetModules()
      ;({ startCheck } = await import('../../../src/services/publishing-checks.js'))
    })

    test('Should return a succeeded outcome with jobId on success', async () => {
      mockStartAnalysis.mockResolvedValueOnce({ jobId: 'job-xyz', status: 'pending' })

      const result = await startCheck('doc-1')
      expect(result.succeeded).toBe(true)
      expect(result.jobId).toBe('job-xyz')
    })

    test('Should return a failed outcome with reason conflict for 409', async () => {
      mockStartAnalysis.mockRejectedValueOnce(
        Object.assign(new Error('Conflict'), { statusCode: 409 })
      )

      const result = await startCheck('doc-1')
      expect(result.succeeded).toBe(false)
      expect(result.reason).toBe('conflict')
    })

    test('Should return a failed outcome with reason not_found for 404', async () => {
      mockStartAnalysis.mockRejectedValueOnce(
        Object.assign(new Error('Not Found'), { statusCode: 404 })
      )

      const result = await startCheck('doc-1')
      expect(result.succeeded).toBe(false)
      expect(result.reason).toBe('not_found')
    })

    test('Should propagate unexpected errors', async () => {
      mockStartAnalysis.mockRejectedValueOnce(new Error('Network error'))

      await expect(startCheck('doc-1')).rejects.toThrow('Network error')
    })
  })
})
