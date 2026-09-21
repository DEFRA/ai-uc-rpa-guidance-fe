import { vi, describe, test, expect, beforeEach } from 'vitest'

import * as guidanceApi from '../../../src/infra/api/guidance-api.js'
import * as searchService from '../../../src/services/guidance-search.js'

vi.mock('../../../src/infra/api/guidance-api.js')

describe('guidance-search service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Should return the answer and the results', async () => {
    const data = { query: 'sda', answer: null, results: [], indexedDocuments: 3 }
    guidanceApi.searchGuidance.mockResolvedValueOnce({ ok: true, data })

    const result = await searchService.searchGuidance('sda')

    expect(result).toEqual(data)
    expect(guidanceApi.searchGuidance).toHaveBeenCalledWith('sda')
  })

  test('Should propagate unexpected errors', async () => {
    guidanceApi.searchGuidance.mockRejectedValueOnce(new Error('API down'))

    await expect(searchService.searchGuidance('sda')).rejects.toThrow('API down')
  })
})
