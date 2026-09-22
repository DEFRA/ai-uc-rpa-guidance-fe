import { vi, describe, test, expect, beforeEach } from 'vitest'

import * as guidanceApi from '../../../src/infra/api/guidance-api.js'
import * as summaryService from '../../../src/services/document-summaries.js'

vi.mock('../../../src/infra/api/guidance-api.js')

describe('document-summaries service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('#listDocumentSummaries', () => {
    test('Should return the stored summaries', async () => {
      const items = [{ documentId: 'doc-1', title: 'A Guide' }]
      guidanceApi.listSummaries.mockResolvedValueOnce({ ok: true, data: { items } })

      const result = await summaryService.listDocumentSummaries()

      expect(result).toEqual(items)
    })

    test('Should propagate unexpected errors', async () => {
      guidanceApi.listSummaries.mockRejectedValueOnce(new Error('Network error'))

      await expect(summaryService.listDocumentSummaries()).rejects.toThrow('Network error')
    })
  })

  describe('#rebuildDocumentSummaries', () => {
    test('Should return the summaries rebuilt and the failures', async () => {
      const data = {
        items: [{ documentId: 'doc-1' }],
        failures: [{ documentId: 'doc-2', errorMessage: 'not found' }]
      }
      guidanceApi.rebuildSummaries.mockResolvedValueOnce({ ok: true, data })

      const result = await summaryService.rebuildDocumentSummaries(['doc-1', 'doc-2'])

      expect(result).toEqual(data)
      expect(guidanceApi.rebuildSummaries).toHaveBeenCalledWith(['doc-1', 'doc-2'])
    })

    test('Should propagate unexpected errors', async () => {
      guidanceApi.rebuildSummaries.mockRejectedValueOnce(new Error('API down'))

      await expect(summaryService.rebuildDocumentSummaries([])).rejects.toThrow('API down')
    })
  })
})
