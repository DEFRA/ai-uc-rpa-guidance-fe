import { constants as statusCodes } from 'node:http2'
import { vi } from 'vitest'

const { mockListDocuments } = vi.hoisted(() => ({
  mockListDocuments: vi.fn()
}))

vi.mock('../../../../src/infra/api/guidance-api.js', () => ({
  listDocuments: mockListDocuments,
  initiateUpload: vi.fn(),
  getDocument: vi.fn()
}))

import { createServer } from '../../../../src/server/server.js'

describe('#guidanceDocumentsListController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should respond with 200 and render the guidance documents list page', async () => {
    mockListDocuments.mockResolvedValueOnce({
      ok: true,
      data: { items: [], total: 0, page: 1, pageSize: 10 }
    })

    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: '/guidance-documents'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(payload).toContain('Guidance documents')
  })

  test('Should contain a link to upload a guidance document', async () => {
    mockListDocuments.mockResolvedValueOnce({
      ok: true,
      data: { items: [], total: 0, page: 1, pageSize: 10 }
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/guidance-documents'
    })

    expect(payload).toContain('/guidance-documents/upload')
  })

  test('Should offer an Edit link for a complete document', async () => {
    mockListDocuments.mockResolvedValueOnce({
      ok: true,
      data: {
        items: [{ id: 'doc-1', title: 'My Guidance', status: 'complete' }],
        total: 1,
        page: 1,
        pageSize: 10
      }
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/guidance-documents'
    })

    expect(payload).toContain('href="/guidance-documents/doc-1/edit"')
    expect(payload).toContain('Edit')
  })

  test('Should not offer an Edit link before processing completes', async () => {
    mockListDocuments.mockResolvedValueOnce({
      ok: true,
      data: {
        items: [{ id: 'doc-2', title: 'Pending Guidance', status: 'processing' }],
        total: 1,
        page: 1,
        pageSize: 10
      }
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/guidance-documents'
    })

    expect(payload).not.toContain('/guidance-documents/doc-2/edit')
  })

  test('Should render error page when the API is unavailable', async () => {
    mockListDocuments.mockRejectedValueOnce(new Error('API down'))

    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/guidance-documents'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR)
  })
})
