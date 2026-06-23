import { vi, describe, test, expect, beforeEach } from 'vitest'

import * as guidanceApi from '../../../src/infra/api/guidance-api.js'
import * as guidanceService from '../../../src/services/guidance-documents.js'

vi.mock('../../../src/infra/api/guidance-api.js')

describe('guidance-documents service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('#listGuidanceDocuments', () => {
    test('Should return paginated data', async () => {
      const data = { items: [], total: 0, page: 1, pageSize: 10 }
      guidanceApi.listDocuments.mockResolvedValueOnce({ ok: true, data })

      const result = await guidanceService.listGuidanceDocuments(1, 10)

      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(10)
    })

    test('Should propagate unexpected errors', async () => {
      guidanceApi.listDocuments.mockRejectedValueOnce(new Error('Network error'))

      await expect(guidanceService.listGuidanceDocuments()).rejects.toThrow('Network error')
    })
  })

  describe('#getCompleteDocuments', () => {
    test('Should return only documents with status complete', async () => {
      guidanceApi.listDocuments.mockResolvedValueOnce({
        ok: true,
        data: {
          items: [
            { id: 'doc-1', status: 'complete' },
            { id: 'doc-2', status: 'processing' },
            { id: 'doc-3', status: 'complete' }
          ]
        }
      })

      const result = await guidanceService.getCompleteDocuments()
      expect(result.map(d => d.id)).toEqual(['doc-1', 'doc-3'])
    })

    test('Should return empty array when no complete documents', async () => {
      guidanceApi.listDocuments.mockResolvedValueOnce({
        ok: true,
        data: { items: [{ id: 'doc-1', status: 'processing' }] }
      })

      const result = await guidanceService.getCompleteDocuments()
      expect(result).toEqual([])
    })

    test('Should propagate API failure', async () => {
      guidanceApi.listDocuments.mockRejectedValueOnce(new Error('API down'))

      await expect(guidanceService.getCompleteDocuments()).rejects.toThrow('API down')
    })
  })

  describe('#startUpload', () => {
    test('Should return data with uploadId', async () => {
      guidanceApi.initiateUpload.mockResolvedValueOnce({
        ok: true,
        data: { uploadId: 'upload-123' }
      })

      const result = await guidanceService.startUpload('/confirmation')

      expect(result.uploadId).toBe('upload-123')
      expect(guidanceApi.initiateUpload).toHaveBeenCalledWith({
        redirect: '/confirmation'
      })
    })

    test('Should propagate API errors', async () => {
      guidanceApi.initiateUpload.mockRejectedValueOnce(
        Object.assign(new Error('Bad request'), { statusCode: 400 })
      )

      await expect(guidanceService.startUpload('/x')).rejects.toMatchObject({ statusCode: 400 })
    })
  })

  describe('#fetchDocument', () => {
    test('Should return a succeeded outcome with document data', async () => {
      const mockDoc = { id: 'doc-1', title: 'Test', status: 'complete' }
      guidanceApi.getDocument.mockResolvedValueOnce({ ok: true, data: mockDoc })

      const outcome = await guidanceService.fetchDocument('doc-1')
      expect(outcome.succeeded).toBe(true)
      expect(outcome.document).toEqual(mockDoc)
    })

    test('Should return a failed outcome with reason not_found for 404', async () => {
      guidanceApi.getDocument.mockResolvedValueOnce({ ok: false, status: 404, data: null })

      const outcome = await guidanceService.fetchDocument('doc-1')
      expect(outcome.succeeded).toBe(false)
      expect(outcome.reason).toBe('not_found')
    })

    test('Should propagate unexpected errors', async () => {
      guidanceApi.getDocument.mockRejectedValueOnce(new Error('Server error'))

      await expect(guidanceService.fetchDocument('doc-1')).rejects.toThrow('Server error')
    })
  })

  describe('#getDocumentManifest', () => {
    test('Should return the manifest data when found', async () => {
      const manifest = { documentId: 'doc-1', title: 'T', sections: [] }
      guidanceApi.getDocumentManifest.mockResolvedValueOnce({ ok: true, data: manifest })

      expect(await guidanceService.getDocumentManifest('doc-1')).toEqual(manifest)
    })

    test('Should return null when not found', async () => {
      guidanceApi.getDocumentManifest.mockResolvedValueOnce({ ok: false, status: 404, data: null })

      expect(await guidanceService.getDocumentManifest('doc-1')).toBeNull()
    })
  })

  describe('#getDocumentSection', () => {
    test('Should return the markdown when found', async () => {
      guidanceApi.getDocumentSection.mockResolvedValueOnce({ ok: true, data: '## 1 Intro' })

      expect(await guidanceService.getDocumentSection('doc-1', '1')).toBe('## 1 Intro')
    })

    test('Should return null when not found', async () => {
      guidanceApi.getDocumentSection.mockResolvedValueOnce({ ok: false, status: 404, data: null })

      expect(await guidanceService.getDocumentSection('doc-1', '99')).toBeNull()
    })
  })
})
