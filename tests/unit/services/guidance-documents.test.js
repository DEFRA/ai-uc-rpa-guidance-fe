import { vi, describe, test, expect, beforeEach } from 'vitest'

const mockInitiateUpload = vi.fn()
const mockListDocuments = vi.fn()
const mockGetDocument = vi.fn()

vi.mock('../../../src/infra/api/guidance-api.js', () => ({
  initiateUpload: mockInitiateUpload,
  listDocuments: mockListDocuments,
  getDocument: mockGetDocument
}))

describe('guidance-documents service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('#listGuidanceDocuments', () => {
    let listGuidanceDocuments

    beforeEach(async () => {
      vi.resetModules()
      ;({ listGuidanceDocuments } = await import('../../../src/services/guidance-documents.js'))
    })

    test('Should return paginated data', async () => {
      const data = { items: [], total: 0, page: 1, pageSize: 10 }
      mockListDocuments.mockResolvedValueOnce({ ok: true, data })

      const result = await listGuidanceDocuments(1, 10)

      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(10)
    })

    test('Should propagate unexpected errors', async () => {
      mockListDocuments.mockRejectedValueOnce(new Error('Network error'))

      await expect(listGuidanceDocuments()).rejects.toThrow('Network error')
    })
  })

  describe('#getCompleteDocuments', () => {
    let getCompleteDocuments

    beforeEach(async () => {
      vi.resetModules()
      ;({ getCompleteDocuments } = await import('../../../src/services/guidance-documents.js'))
    })

    test('Should return only documents with status complete', async () => {
      mockListDocuments.mockResolvedValueOnce({
        ok: true,
        data: {
          items: [
            { id: 'doc-1', status: 'complete' },
            { id: 'doc-2', status: 'processing' },
            { id: 'doc-3', status: 'complete' }
          ]
        }
      })

      const result = await getCompleteDocuments()
      expect(result.map(d => d.id)).toEqual(['doc-1', 'doc-3'])
    })

    test('Should return empty array when no complete documents', async () => {
      mockListDocuments.mockResolvedValueOnce({
        ok: true,
        data: { items: [{ id: 'doc-1', status: 'processing' }] }
      })

      const result = await getCompleteDocuments()
      expect(result).toEqual([])
    })

    test('Should propagate API failure', async () => {
      mockListDocuments.mockRejectedValueOnce(new Error('API down'))

      await expect(getCompleteDocuments()).rejects.toThrow('API down')
    })
  })

  describe('#startUpload', () => {
    let startUpload

    beforeEach(async () => {
      vi.resetModules()
      ;({ startUpload } = await import('../../../src/services/guidance-documents.js'))
    })

    test('Should return data with uploadId', async () => {
      mockInitiateUpload.mockResolvedValueOnce({
        ok: true,
        data: { uploadId: 'upload-123' }
      })

      const result = await startUpload('/confirmation')

      expect(result.uploadId).toBe('upload-123')
      expect(mockInitiateUpload).toHaveBeenCalledWith({
        redirect: '/confirmation'
      })
    })

    test('Should propagate API errors', async () => {
      mockInitiateUpload.mockRejectedValueOnce(
        Object.assign(new Error('Bad request'), { statusCode: 400 })
      )

      await expect(startUpload('/x')).rejects.toMatchObject({ statusCode: 400 })
    })
  })

  describe('#fetchDocument', () => {
    let fetchDocument

    beforeEach(async () => {
      vi.resetModules()
      ;({ fetchDocument } = await import('../../../src/services/guidance-documents.js'))
    })

    test('Should return a succeeded outcome with document data', async () => {
      const mockDoc = { id: 'doc-1', title: 'Test', status: 'complete' }
      mockGetDocument.mockResolvedValueOnce({ ok: true, data: mockDoc })

      const outcome = await fetchDocument('doc-1')
      expect(outcome.succeeded).toBe(true)
      expect(outcome.document).toEqual(mockDoc)
    })

    test('Should return a failed outcome with reason not_found for 404', async () => {
      mockGetDocument.mockResolvedValueOnce({ ok: false, status: 404, data: null })

      const outcome = await fetchDocument('doc-1')
      expect(outcome.succeeded).toBe(false)
      expect(outcome.reason).toBe('not_found')
    })

    test('Should propagate unexpected errors', async () => {
      mockGetDocument.mockRejectedValueOnce(new Error('Server error'))

      await expect(fetchDocument('doc-1')).rejects.toThrow('Server error')
    })
  })
})
