import { vi, describe, test, expect, beforeEach } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

const fetchMock = createFetchMock(vi)

vi.mock('../../../../src/config/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'guidanceApi.mockAnalysis') return false
      return 'http://guidance-api.test'
    })
  }
}))

describe('#analyseDocument', () => {
  let analyseDocument

  beforeEach(async () => {
    fetchMock.enableMocks()
    fetchMock.resetMocks()
    vi.resetModules()

    const module = await import('../../../../src/infra/api/analyse.js')
    analyseDocument = module.analyseDocument
  })

  test('Should GET /guidance/documents/:id/analyse when API is available', async () => {
    const mockResponse = {
      verdict: 'ready',
      summary: 'Looks good.',
      document_title: 'Test Doc',
      findings: [],
      good_points: ['Well structured'],
      usage: { input_tokens: 100, output_tokens: 50 }
    }
    fetchMock.mockResponseOnce(JSON.stringify(mockResponse))

    const result = await analyseDocument('doc-123')

    expect(result).toEqual(mockResponse)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://guidance-api.test/guidance/documents/doc-123/analyse'
    )
  })

  test('Should throw with status message on non-OK response', async () => {
    fetchMock.mockResponseOnce('', { status: 404, statusText: 'Not Found' })

    await expect(analyseDocument('missing-id')).rejects.toThrow(
      'Failed to fetch analysis: 404 Not Found'
    )
  })

  test('Should throw on 500 server error', async () => {
    fetchMock.mockResponseOnce('', {
      status: 500,
      statusText: 'Internal Server Error'
    })

    await expect(analyseDocument('any-id')).rejects.toThrow(
      'Failed to fetch analysis: 500 Internal Server Error'
    )
  })
})
