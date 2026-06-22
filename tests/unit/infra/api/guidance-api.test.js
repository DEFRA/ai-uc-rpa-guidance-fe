import { vi, describe, test, expect, beforeEach } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

const fetchMock = createFetchMock(vi)

vi.mock('../../../../src/config/config.js', () => ({
  config: { get: vi.fn().mockReturnValue('http://guidance-api.test') }
}))

describe('#guidanceApi', () => {
  let listDocuments, getDocument, initiateUpload, startAnalysis, getLatestAnalysis

  beforeEach(async () => {
    fetchMock.enableMocks()
    fetchMock.resetMocks()
    vi.resetModules()

    const module = await import('../../../../src/infra/api/guidance-api.js')
    listDocuments = module.listDocuments
    getDocument = module.getDocument
    initiateUpload = module.initiateUpload
    startAnalysis = module.startAnalysis
    getLatestAnalysis = module.getLatestAnalysis
  })

  describe('#listDocuments', () => {
    test('Should GET /guidance/documents with pagination params', async () => {
      const data = { items: [], total: 0, page: 2, pageSize: 20 }
      fetchMock.mockResponseOnce(JSON.stringify(data), { status: 200 })

      const res = await listDocuments(2, 20)

      expect(res.ok).toBe(true)
      expect(res.data).toEqual(data)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://guidance-api.test/guidance/documents?page=2&page_size=20',
        expect.objectContaining({ method: 'GET' })
      )
    })

    test('Should default to page 1 and pageSize 10', async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ items: [], total: 0, page: 1, pageSize: 10 })
      )

      await listDocuments()

      expect(fetchMock).toHaveBeenCalledWith(
        'http://guidance-api.test/guidance/documents?page=1&page_size=10',
        expect.objectContaining({ method: 'GET' })
      )
    })

    test('Should throw on non-OK response', async () => {
      fetchMock.mockResponseOnce('', {
        status: 503,
        statusText: 'Service Unavailable'
      })

      await expect(listDocuments()).rejects.toThrow(
        'Guidance API GET /guidance/documents?page=1&page_size=10' +
        ' failed: 503 Service Unavailable'
      )
    })
  })

  describe('#getDocument', () => {
    test('Should GET /guidance/documents/:id and return envelope', async () => {
      const doc = { id: 'doc-1', title: 'Test', status: 'complete' }
      fetchMock.mockResponseOnce(JSON.stringify(doc))

      const res = await getDocument('doc-1')

      expect(res.ok).toBe(true)
      expect(res.data).toEqual(doc)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://guidance-api.test/guidance/documents/doc-1',
        expect.objectContaining({})
      )
    })

    test('Should return { ok: false } on 404 without throwing', async () => {
      fetchMock.mockResponseOnce('', { status: 404, statusText: 'Not Found' })

      const res = await getDocument('missing')

      expect(res.ok).toBe(false)
      expect(res.status).toBe(404)
    })

    test('Should throw on unexpected non-OK response', async () => {
      fetchMock.mockResponseOnce('', {
        status: 503,
        statusText: 'Service Unavailable'
      })

      await expect(getDocument('doc-1')).rejects.toMatchObject({
        statusCode: 503
      })
    })
  })

  describe('#initiateUpload', () => {
    test('Should POST to /guidance/documents with payload', async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ uploadId: 'upload-123' }),
        { status: 200 }
      )

      const res = await initiateUpload({
        redirect: 'http://localhost/callback'
      })

      expect(res.ok).toBe(true)
      expect(res.data).toEqual({ uploadId: 'upload-123' })
      expect(fetchMock).toHaveBeenCalledWith(
        'http://guidance-api.test/guidance/documents',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ redirect: 'http://localhost/callback' })
        })
      )
    })

    test('Should throw on non-OK response', async () => {
      fetchMock.mockResponseOnce('', {
        status: 502,
        statusText: 'Bad Gateway'
      })

      await expect(initiateUpload({ redirect: '/x' })).rejects.toMatchObject({
        statusCode: 502
      })
    })
  })

  describe('#startAnalysis', () => {
    test('Should POST to /publishing/analyse and return envelope', async () => {
      const job = { jobId: 'job-123', status: 'pending' }
      fetchMock.mockResponseOnce(JSON.stringify(job), { status: 202 })

      const res = await startAnalysis('doc-456')

      expect(res.ok).toBe(true)
      expect(res.data).toEqual(job)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://guidance-api.test/publishing/analyse',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ documentId: 'doc-456' })
        })
      )
    })

    test('Should return { ok: false } on 409 without throwing', async () => {
      fetchMock.mockResponseOnce('', { status: 409, statusText: 'Conflict' })

      const res = await startAnalysis('doc-1')

      expect(res.ok).toBe(false)
      expect(res.status).toBe(409)
    })

    test('Should return { ok: false } on 404 without throwing', async () => {
      fetchMock.mockResponseOnce('', { status: 404, statusText: 'Not Found' })

      const res = await startAnalysis('missing')

      expect(res.ok).toBe(false)
      expect(res.status).toBe(404)
    })

    test('Should throw on unexpected non-OK response', async () => {
      fetchMock.mockResponseOnce('', {
        status: 500,
        statusText: 'Internal Server Error'
      })

      await expect(startAnalysis('doc-1')).rejects.toMatchObject({
        statusCode: 500
      })
    })
  })

  describe('#getLatestAnalysis', () => {
    test('Should GET /publishing/documents/:id/analysis', async () => {
      const job = { jobId: 'job-123', status: 'completed' }
      fetchMock.mockResponseOnce(JSON.stringify(job))

      const res = await getLatestAnalysis('doc-456')

      expect(res.ok).toBe(true)
      expect(res.data).toEqual(job)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://guidance-api.test' +
        '/publishing/documents/doc-456/analysis',
        expect.objectContaining({})
      )
    })

    test('Should return { ok: false } on 404 without throwing', async () => {
      fetchMock.mockResponseOnce('', { status: 404, statusText: 'Not Found' })

      const res = await getLatestAnalysis('doc-none')

      expect(res.ok).toBe(false)
      expect(res.status).toBe(404)
    })

    test('Should throw on unexpected non-OK response', async () => {
      fetchMock.mockResponseOnce('', {
        status: 503,
        statusText: 'Service Unavailable'
      })

      await expect(getLatestAnalysis('doc-1')).rejects.toMatchObject({
        statusCode: 503
      })
    })
  })
})
