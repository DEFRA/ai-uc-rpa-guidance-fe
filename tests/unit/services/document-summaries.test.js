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

  describe('#startIndexRebuild', () => {
    test('Should return the rebuild the API queued', async () => {
      const data = { rebuildId: 'rebuild-1', status: 'queued' }
      guidanceApi.rebuildSummaries.mockResolvedValueOnce({ ok: true, status: 202, data })

      const result = await summaryService.startIndexRebuild('partial')

      expect(result).toEqual(data)
      expect(guidanceApi.rebuildSummaries).toHaveBeenCalledWith('partial')
    })

    test('Should return null when a rebuild is already running', async () => {
      guidanceApi.rebuildSummaries.mockResolvedValueOnce({ ok: false, status: 409, data: null })

      const result = await summaryService.startIndexRebuild()

      expect(result).toBeNull()
    })

    test('Should propagate unexpected errors', async () => {
      guidanceApi.rebuildSummaries.mockRejectedValueOnce(new Error('API down'))

      await expect(summaryService.startIndexRebuild()).rejects.toThrow('API down')
    })
  })

  describe('#getIndexRebuild', () => {
    test('Should return the rebuild as it stands', async () => {
      const data = { rebuildId: 'rebuild-1', status: 'running', completed: 2, total: 5 }
      guidanceApi.getSummaryRebuild.mockResolvedValueOnce({ ok: true, data })

      const result = await summaryService.getIndexRebuild('rebuild-1')

      expect(result).toEqual(data)
      expect(guidanceApi.getSummaryRebuild).toHaveBeenCalledWith('rebuild-1')
    })

    test('Should return null for a rebuild the API does not know', async () => {
      guidanceApi.getSummaryRebuild.mockResolvedValueOnce({ ok: false, status: 404, data: null })

      const result = await summaryService.getIndexRebuild('rebuild-1')

      expect(result).toBeNull()
    })
  })

  describe('#getCurrentIndexRebuild', () => {
    test('Should return the rebuild queued or running', async () => {
      const data = { rebuildId: 'rebuild-1', status: 'running' }
      guidanceApi.getCurrentSummaryRebuild.mockResolvedValueOnce({ ok: true, data })

      expect(await summaryService.getCurrentIndexRebuild()).toEqual(data)
    })

    test('Should return null when none is', async () => {
      guidanceApi.getCurrentSummaryRebuild.mockResolvedValueOnce({ ok: false, status: 404, data: null })

      expect(await summaryService.getCurrentIndexRebuild()).toBeNull()
    })
  })

  describe('#cancelIndexRebuild', () => {
    test('Should return the cancelled rebuild', async () => {
      const data = { rebuildId: 'rebuild-1', status: 'cancelled' }
      guidanceApi.cancelSummaryRebuild.mockResolvedValueOnce({ ok: true, data })

      expect(await summaryService.cancelIndexRebuild('rebuild-1')).toEqual(data)
      expect(guidanceApi.cancelSummaryRebuild).toHaveBeenCalledWith('rebuild-1')
    })

    test.each([404, 409])('Should return null when the API answers %i', async (status) => {
      guidanceApi.cancelSummaryRebuild.mockResolvedValueOnce({ ok: false, status, data: null })

      expect(await summaryService.cancelIndexRebuild('rebuild-1')).toBeNull()
    })
  })
})
