import { vi, describe, test, expect, beforeEach } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import * as guidanceApi from '../../../../src/infra/api/guidance-api.js'

const fetchMock = createFetchMock(vi)

vi.mock('../../../../src/config/config.js', () => ({
  config: { get: vi.fn().mockReturnValue('http://guidance-api.test') }
}))

describe('#guidanceApi', () => {
  beforeEach(() => {
    fetchMock.enableMocks()
    fetchMock.resetMocks()
  })

  describe('#listDocuments', () => {
    test('Should GET /guidance/documents with pagination params', async () => {
      const data = { items: [], total: 0, page: 2, pageSize: 20 }
      fetchMock.mockResponseOnce(JSON.stringify(data), { status: 200 })

      const res = await guidanceApi.listDocuments(2, 20)

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

      await guidanceApi.listDocuments()

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

      await expect(guidanceApi.listDocuments()).rejects.toThrow(
        'Guidance API GET /guidance/documents?page=1&page_size=10' +
        ' failed: 503 Service Unavailable'
      )
    })
  })

  describe('#getDocument', () => {
    test('Should GET /guidance/documents/:id and return envelope', async () => {
      const doc = { id: 'doc-1', title: 'Test', status: 'complete' }
      fetchMock.mockResponseOnce(JSON.stringify(doc))

      const res = await guidanceApi.getDocument('doc-1')

      expect(res.ok).toBe(true)
      expect(res.data).toEqual(doc)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://guidance-api.test/guidance/documents/doc-1',
        expect.objectContaining({})
      )
    })

    test('Should return { ok: false } on 404 without throwing', async () => {
      fetchMock.mockResponseOnce('', { status: 404, statusText: 'Not Found' })

      const res = await guidanceApi.getDocument('missing')

      expect(res.ok).toBe(false)
      expect(res.status).toBe(404)
    })

    test('Should throw on unexpected non-OK response', async () => {
      fetchMock.mockResponseOnce('', {
        status: 503,
        statusText: 'Service Unavailable'
      })

      await expect(guidanceApi.getDocument('doc-1')).rejects.toMatchObject({
        statusCode: 503
      })
    })
  })

  describe('#getDocumentManifest', () => {
    test('Should GET /guidance/documents/:id/manifest and return envelope', async () => {
      const manifest = { documentId: 'doc-1', title: 'T', sections: [] }
      fetchMock.mockResponseOnce(JSON.stringify(manifest))

      const res = await guidanceApi.getDocumentManifest('doc-1')

      expect(res.ok).toBe(true)
      expect(res.data).toEqual(manifest)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://guidance-api.test/guidance/documents/doc-1/manifest',
        expect.objectContaining({})
      )
    })

    test('Should return { ok: false } on 404 without throwing', async () => {
      fetchMock.mockResponseOnce('', { status: 404, statusText: 'Not Found' })

      const res = await guidanceApi.getDocumentManifest('missing')

      expect(res.ok).toBe(false)
      expect(res.status).toBe(404)
    })
  })

  describe('#getDocumentSection', () => {
    test('Should GET the section as text/markdown', async () => {
      fetchMock.mockResponseOnce('## 1 Intro\n\nContent.', {
        headers: { 'Content-Type': 'text/markdown' }
      })

      const res = await guidanceApi.getDocumentSection('doc-1', '1.2')

      expect(res.ok).toBe(true)
      expect(res.data).toBe('## 1 Intro\n\nContent.')
      expect(fetchMock).toHaveBeenCalledWith(
        'http://guidance-api.test/guidance/documents/doc-1/sections/1.2',
        expect.objectContaining({})
      )
    })

    test('Should return { ok: false } on 404 without throwing', async () => {
      fetchMock.mockResponseOnce('', { status: 404, statusText: 'Not Found' })

      const res = await guidanceApi.getDocumentSection('doc-1', '99')

      expect(res.ok).toBe(false)
      expect(res.status).toBe(404)
    })
  })

  describe('#getDocumentImage', () => {
    test('Should GET image bytes as a Buffer', async () => {
      const imageBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47])
      fetchMock.mockResponseOnce(imageBytes)

      const res = await guidanceApi.getDocumentImage('doc-1', 'img_1.png')

      expect(res.ok).toBe(true)
      expect(Buffer.isBuffer(res.data)).toBe(true)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://guidance-api.test/guidance/documents/doc-1/images/img_1.png',
        expect.objectContaining({ method: 'GET' })
      )
    })

    test('Should return { ok: false } on 404 without throwing', async () => {
      fetchMock.mockResponseOnce('', { status: 404, statusText: 'Not Found' })

      const res = await guidanceApi.getDocumentImage('doc-1', 'missing.png')

      expect(res.ok).toBe(false)
      expect(res.status).toBe(404)
    })
  })

  describe('#initiateUpload', () => {
    test('Should POST to /guidance/documents with payload', async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ uploadId: 'upload-123' }),
        { status: 200 }
      )

      const res = await guidanceApi.initiateUpload({
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

      await expect(guidanceApi.initiateUpload({ redirect: '/x' })).rejects.toMatchObject({
        statusCode: 502
      })
    })
  })

  describe('#startAnalysis', () => {
    test('Should POST to /publishing/analyse and return envelope', async () => {
      const job = { jobId: 'job-123', status: 'pending' }
      fetchMock.mockResponseOnce(JSON.stringify(job), { status: 202 })

      const res = await guidanceApi.startAnalysis('doc-456')

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

      const res = await guidanceApi.startAnalysis('doc-1')

      expect(res.ok).toBe(false)
      expect(res.status).toBe(409)
    })

    test('Should return { ok: false } on 404 without throwing', async () => {
      fetchMock.mockResponseOnce('', { status: 404, statusText: 'Not Found' })

      const res = await guidanceApi.startAnalysis('missing')

      expect(res.ok).toBe(false)
      expect(res.status).toBe(404)
    })

    test('Should throw on unexpected non-OK response', async () => {
      fetchMock.mockResponseOnce('', {
        status: 500,
        statusText: 'Internal Server Error'
      })

      await expect(guidanceApi.startAnalysis('doc-1')).rejects.toMatchObject({
        statusCode: 500
      })
    })
  })

  describe('#getLatestAnalysis', () => {
    test('Should GET /publishing/documents/:id/analysis', async () => {
      const job = { jobId: 'job-123', status: 'completed' }
      fetchMock.mockResponseOnce(JSON.stringify(job))

      const res = await guidanceApi.getLatestAnalysis('doc-456')

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

      const res = await guidanceApi.getLatestAnalysis('doc-none')

      expect(res.ok).toBe(false)
      expect(res.status).toBe(404)
    })

    test('Should throw on unexpected non-OK response', async () => {
      fetchMock.mockResponseOnce('', {
        status: 503,
        statusText: 'Service Unavailable'
      })

      await expect(guidanceApi.getLatestAnalysis('doc-1')).rejects.toMatchObject({
        statusCode: 503
      })
    })
  })

  describe('#startReview', () => {
    test('Should POST /critique/jobs with the documentId', async () => {
      const job = { jobId: 'job-cr-1', status: 'pending' }
      fetchMock.mockResponseOnce(JSON.stringify(job), { status: 202 })

      const res = await guidanceApi.startReview('doc-456')

      expect(res.ok).toBe(true)
      expect(res.data).toEqual(job)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://guidance-api.test/critique/jobs',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ documentId: 'doc-456' })
        })
      )
    })

    test('Should return { ok: false } on 409 without throwing', async () => {
      fetchMock.mockResponseOnce('', { status: 409, statusText: 'Conflict' })

      const res = await guidanceApi.startReview('doc-1')

      expect(res.ok).toBe(false)
      expect(res.status).toBe(409)
    })

    test('Should return { ok: false } on 404 without throwing', async () => {
      fetchMock.mockResponseOnce('', { status: 404, statusText: 'Not Found' })

      const res = await guidanceApi.startReview('missing')

      expect(res.ok).toBe(false)
      expect(res.status).toBe(404)
    })

    test('Should throw on unexpected non-OK response', async () => {
      fetchMock.mockResponseOnce('', {
        status: 500,
        statusText: 'Internal Server Error'
      })

      await expect(guidanceApi.startReview('doc-1')).rejects.toMatchObject({
        statusCode: 500
      })
    })
  })

  describe('#getLatestReview', () => {
    test('Should GET /critique/documents/:id/analysis', async () => {
      const job = { jobId: 'job-cr-2', status: 'completed' }
      fetchMock.mockResponseOnce(JSON.stringify(job))

      const res = await guidanceApi.getLatestReview('doc-456')

      expect(res.ok).toBe(true)
      expect(res.data).toEqual(job)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://guidance-api.test' +
        '/critique/documents/doc-456/analysis',
        expect.objectContaining({})
      )
    })

    test('Should return { ok: false } on 404 without throwing', async () => {
      fetchMock.mockResponseOnce('', { status: 404, statusText: 'Not Found' })

      const res = await guidanceApi.getLatestReview('doc-none')

      expect(res.ok).toBe(false)
      expect(res.status).toBe(404)
    })

    test('Should throw on unexpected non-OK response', async () => {
      fetchMock.mockResponseOnce('', {
        status: 503,
        statusText: 'Service Unavailable'
      })

      await expect(guidanceApi.getLatestReview('doc-1')).rejects.toMatchObject({
        statusCode: 503
      })
    })
  })
})
