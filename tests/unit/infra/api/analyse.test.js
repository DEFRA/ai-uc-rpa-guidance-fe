import { vi, describe, test, expect, beforeEach } from 'vitest'

const mockGetLatestAnalysis = vi.fn()

vi.mock('../../../../src/infra/api/publishing-jobs.js', () => ({
  getLatestAnalysis: mockGetLatestAnalysis
}))

vi.mock('../../../../src/config/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'guidanceApi.mockAnalysis') return false
      if (key === 'guidanceApi.mockDataFile') return null
      return 'http://guidance-api.test'
    })
  }
}))

describe('#analyseDocument', () => {
  let analyseDocument

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    const module = await import('../../../../src/infra/api/analyse.js')
    analyseDocument = module.analyseDocument
  })

  test('Should return job result from getLatestAnalysis', async () => {
    const mockResult = {
      verdict: 'ready',
      summary: 'Looks good.',
      document_title: 'Test Doc',
      findings: [],
      good_points: ['Well structured'],
      usage: { input_tokens: 100, output_tokens: 50 }
    }
    mockGetLatestAnalysis.mockResolvedValueOnce({ result: mockResult })

    const result = await analyseDocument('doc-123')

    expect(mockGetLatestAnalysis).toHaveBeenCalledWith('doc-123')
    expect(result).toEqual(mockResult)
  })

  test('Should propagate errors from getLatestAnalysis', async () => {
    const error = Object.assign(
      new Error('Failed to get latest analysis: 404 Not Found'),
      { statusCode: 404 }
    )
    mockGetLatestAnalysis.mockRejectedValueOnce(error)

    await expect(analyseDocument('missing-id')).rejects.toThrow(
      'Failed to get latest analysis: 404 Not Found'
    )
  })

  test('Should propagate 500 errors', async () => {
    const error = Object.assign(
      new Error('Failed to get latest analysis: 500 Internal Server Error'),
      { statusCode: 500 }
    )
    mockGetLatestAnalysis.mockRejectedValueOnce(error)

    await expect(analyseDocument('any-id')).rejects.toThrow(
      'Failed to get latest analysis: 500 Internal Server Error'
    )
  })
})
