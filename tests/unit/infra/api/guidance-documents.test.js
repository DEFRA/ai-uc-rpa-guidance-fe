import { vi, describe, test, expect, beforeEach } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

const fetchMock = createFetchMock(vi)

vi.mock('../../../../src/config/config.js', () => ({
  config: { get: vi.fn().mockReturnValue('http://guidance-api.test') }
}))

describe('#guidanceDocumentsApi', () => {
  let initiateUpload, listDocuments, getDocument

  beforeEach(async () => {
    fetchMock.enableMocks()
    fetchMock.resetMocks()
    vi.resetModules()

    const module = await import(
      '../../../../src/infra/api/guidance-documents.js'
    )
    initiateUpload = module.initiateUpload
    listDocuments = module.listDocuments
    getDocument = module.getDocument
  })

  describe('#initiateUpload', () => {
    test('Should POST to /guidance/documents with payload body', async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ uploadId: 'upload-123' }),
        { status: 200 }
      )

      const result = await initiateUpload({
        redirect: 'http://localhost/callback'
      })

      expect(result).toEqual({ uploadId: 'upload-123' })
      expect(fetchMock).toHaveBeenCalledWith(
        'http://guidance-api.test/guidance/documents',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ redirect: 'http://localhost/callback' })
        })
      )
    })

    test('Should throw when API returns a non-OK status', async () => {
      fetchMock.mockResponseOnce('', {
        status: 502,
        statusText: 'Bad Gateway'
      })

      await expect(initiateUpload({ redirect: '/x' })).rejects.toThrow(
        'Failed to initiate upload: 502 Bad Gateway'
      )
    })
  })

  describe('#listDocuments', () => {
    test('Should GET /guidance/documents with pagination params', async () => {
      const mockResponse = { items: [], total: 0, page: 2, pageSize: 20 }
      fetchMock.mockResponseOnce(JSON.stringify(mockResponse))

      const result = await listDocuments(2, 20)

      expect(result).toEqual(mockResponse)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://guidance-api.test/guidance/documents?page=2&page_size=20'
      )
    })

    test('Should default to page 1 and pageSize 10', async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ items: [], total: 0, page: 1, pageSize: 10 })
      )

      await listDocuments()

      expect(fetchMock).toHaveBeenCalledWith(
        'http://guidance-api.test/guidance/documents?page=1&page_size=10'
      )
    })

    test('Should throw on non-OK response', async () => {
      fetchMock.mockResponseOnce('', {
        status: 503,
        statusText: 'Service Unavailable'
      })

      await expect(listDocuments()).rejects.toThrow(
        'Failed to list documents: 503 Service Unavailable'
      )
    })
  })

  describe('#getDocument', () => {
    test('Should GET /guidance/documents/:id', async () => {
      const mockDoc = { id: 'doc-1', title: 'Test', status: 'complete' }
      fetchMock.mockResponseOnce(JSON.stringify(mockDoc))

      const result = await getDocument('doc-1')

      expect(result).toEqual(mockDoc)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://guidance-api.test/guidance/documents/doc-1'
      )
    })

    test('Should throw on 404', async () => {
      fetchMock.mockResponseOnce('', { status: 404, statusText: 'Not Found' })

      await expect(getDocument('missing')).rejects.toThrow(
        'Failed to get document: 404 Not Found'
      )
    })
  })
})
