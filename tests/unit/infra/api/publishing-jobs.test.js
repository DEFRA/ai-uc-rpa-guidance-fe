import { vi, describe, test, expect, beforeEach } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

const fetchMock = createFetchMock(vi)

vi.mock('../../../../src/config/config.js', () => ({
  config: { get: vi.fn().mockReturnValue('http://guidance-api.test') }
}))

describe('#publishingJobsApi', () => {
  let startAnalysis, getJob, getLatestAnalysis

  beforeEach(async () => {
    fetchMock.enableMocks()
    fetchMock.resetMocks()
    vi.resetModules()

    const module = await import(
      '../../../../src/infra/api/publishing-jobs.js'
    )
    startAnalysis = module.startAnalysis
    getJob = module.getJob
    getLatestAnalysis = module.getLatestAnalysis
  })

  describe('#startAnalysis', () => {
    test('Should POST to /publishing/analyse with documentId', async () => {
      const mockJob = {
        jobId: 'job-123',
        documentId: 'doc-456',
        status: 'pending'
      }
      fetchMock.mockResponseOnce(JSON.stringify(mockJob), { status: 202 })

      const result = await startAnalysis('doc-456')

      expect(result).toEqual(mockJob)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://guidance-api.test/publishing/analyse',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ documentId: 'doc-456' })
        })
      )
    })

    test('Should throw with status code on 404', async () => {
      fetchMock.mockResponseOnce('', {
        status: 404,
        statusText: 'Not Found'
      })

      const error = await startAnalysis('missing').catch((e) => e)

      expect(error.message).toBe(
        'Failed to start analysis: 404 Not Found'
      )
      expect(error.statusCode).toBe(404)
    })

    test('Should throw with status code on 409', async () => {
      fetchMock.mockResponseOnce('', {
        status: 409,
        statusText: 'Conflict'
      })

      const error = await startAnalysis('not-ready').catch((e) => e)

      expect(error.message).toBe(
        'Failed to start analysis: 409 Conflict'
      )
      expect(error.statusCode).toBe(409)
    })
  })

  describe('#getJob', () => {
    test('Should GET /publishing/jobs/:jobId', async () => {
      const mockJob = {
        jobId: 'job-123',
        status: 'completed',
        result: {}
      }
      fetchMock.mockResponseOnce(JSON.stringify(mockJob))

      const result = await getJob('job-123')

      expect(result).toEqual(mockJob)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://guidance-api.test/publishing/jobs/job-123'
      )
    })

    test('Should throw with status code on 404', async () => {
      fetchMock.mockResponseOnce('', {
        status: 404,
        statusText: 'Not Found'
      })

      const error = await getJob('missing').catch((e) => e)

      expect(error.message).toBe('Failed to get job: 404 Not Found')
      expect(error.statusCode).toBe(404)
    })
  })

  describe('#getLatestAnalysis', () => {
    test(
      'Should GET /publishing/documents/:documentId/analysis',
      async () => {
        const mockJob = { jobId: 'job-123', status: 'completed' }
        fetchMock.mockResponseOnce(JSON.stringify(mockJob))

        const result = await getLatestAnalysis('doc-456')

        expect(result).toEqual(mockJob)
        expect(fetchMock).toHaveBeenCalledWith(
          'http://guidance-api.test' +
          '/publishing/documents/doc-456/analysis'
        )
      }
    )

    test('Should throw with status code on 404', async () => {
      fetchMock.mockResponseOnce('', {
        status: 404,
        statusText: 'Not Found'
      })

      const error = await getLatestAnalysis('doc-none').catch((e) => e)

      expect(error.message).toBe(
        'Failed to get latest analysis: 404 Not Found'
      )
      expect(error.statusCode).toBe(404)
    })
  })
})
