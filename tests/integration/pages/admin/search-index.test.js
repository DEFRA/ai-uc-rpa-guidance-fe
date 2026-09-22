import { constants as statusCodes } from 'node:http2'
import { vi } from 'vitest'

const { mockListDocuments, mockListSummaries, mockRebuildSummaries } = vi.hoisted(() => ({
  mockListDocuments: vi.fn(),
  mockListSummaries: vi.fn(),
  mockRebuildSummaries: vi.fn()
}))

vi.mock('../../../../src/infra/api/guidance-api.js', () => ({
  listDocuments: mockListDocuments,
  listSummaries: mockListSummaries,
  rebuildSummaries: mockRebuildSummaries,
  initiateUpload: vi.fn(),
  getDocument: vi.fn()
}))

import { createServer } from '../../../../src/server/server.js'

const DOCUMENT_ID = '11111111-1111-1111-1111-111111111111'

const documentsPage = (items) => ({
  ok: true,
  data: { items, total: items.length, page: 1, pageSize: 100 }
})

const section = (number, overrides = {}) => ({
  number,
  heading: `Heading ${number}`,
  level: 1,
  summary: `What section ${number} covers.`,
  keywords: [`term-${number}`],
  startPath: `/guidance-documents/${DOCUMENT_ID}/sections/${number}`,
  ...overrides
})

const summary = (overrides = {}) => ({
  documentId: DOCUMENT_ID,
  title: 'A Guide',
  about: 'What it is about.',
  usedFor: 'What it is used for.',
  path: `s3://bucket/parsed_guidance/${DOCUMENT_ID}/summary.md`,
  startPath: `/guidance-documents/${DOCUMENT_ID}/sections/1`,
  keywords: ['ROCR', 'Revenue Option Claim Rule'],
  acronyms: [
    { acronym: 'SDA', expansion: 'Severely Disadvantaged Area', sections: ['1', '1.1'] },
    { acronym: 'IAPA', expansion: null, sections: ['1'] }
  ],
  sections: [section('1'), section('1.1')],
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides
})

describe('#searchIndexAdminController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should list every document with a checkbox and one rebuild button', async () => {
    mockListDocuments.mockResolvedValueOnce(
      documentsPage([{ id: DOCUMENT_ID, filename: 'guide.docx', status: 'complete' }])
    )

    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(payload).toContain(`value="${DOCUMENT_ID}"`)
    expect(payload).toContain('name="documentIds"')
    expect(payload).toContain('Rebuild index')
  })

  test('Should say so when there is nothing to index', async () => {
    mockListDocuments.mockResolvedValueOnce(documentsPage([]))

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index'
    })

    expect(payload).toContain('There are no guidance documents to index')
    expect(payload).not.toContain('name="documentIds"')
  })

  test('Should stay off the service navigation', async () => {
    mockListDocuments.mockResolvedValueOnce(documentsPage([]))

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index'
    })

    expect(payload).not.toContain('defra-service-navigation__link" href="/admin')
  })

  test('Should warn that rebuilding discards the whole index', async () => {
    mockListDocuments.mockResolvedValueOnce(
      documentsPage([{ id: DOCUMENT_ID, filename: 'guide.docx', status: 'complete' }])
    )

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index'
    })

    expect(payload).toContain('Rebuilding discards the whole index first')
  })

  test('Should rebuild the selected summaries and redirect to the confirmation', async () => {
    mockRebuildSummaries.mockResolvedValueOnce({
      ok: true,
      data: { items: [summary()], purged: 3, durationSeconds: 110.4, failures: [] }
    })

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: '/admin/search-index/rebuild',
      payload: { documentIds: [DOCUMENT_ID] }
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
    expect(headers.location).toBe(
      '/admin/search-index/rebuilt?purged=3&failed=0&took=110.4'
    )
    expect(mockRebuildSummaries).toHaveBeenCalledWith([DOCUMENT_ID])
  })

  test('Should carry the failure count through the redirect', async () => {
    mockRebuildSummaries.mockResolvedValueOnce({
      ok: true,
      data: {
        items: [],
        purged: 0,
        durationSeconds: 2,
        failures: [{ documentId: DOCUMENT_ID, errorMessage: 'not found' }]
      }
    })

    const { headers } = await server.inject({
      method: 'POST',
      url: '/admin/search-index/rebuild',
      payload: { documentIds: [DOCUMENT_ID] }
    })

    expect(headers.location).toBe(
      '/admin/search-index/rebuilt?purged=0&failed=1&took=2'
    )
  })

  test('Should accept a single selected document', async () => {
    mockRebuildSummaries.mockResolvedValueOnce({
      ok: true,
      data: { items: [summary()], purged: 1, durationSeconds: 1, failures: [] }
    })

    await server.inject({
      method: 'POST',
      url: '/admin/search-index/rebuild',
      payload: { documentIds: DOCUMENT_ID }
    })

    expect(mockRebuildSummaries).toHaveBeenCalledWith([DOCUMENT_ID])
  })

  test('Should not empty the index when nothing is selected', async () => {
    mockListDocuments.mockResolvedValueOnce(
      documentsPage([{ id: DOCUMENT_ID, filename: 'guide.docx', status: 'complete' }])
    )

    const { statusCode, payload } = await server.inject({
      method: 'POST',
      url: '/admin/search-index/rebuild',
      payload: {}
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
    expect(payload).toContain('Select at least one document to index')
    expect(mockRebuildSummaries).not.toHaveBeenCalled()
  })

  test('Should reject a selection that is not a document id', async () => {
    mockListDocuments.mockResolvedValueOnce(documentsPage([]))

    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/admin/search-index/rebuild',
      payload: { documentIds: ['not-a-uuid'] }
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
    expect(mockRebuildSummaries).not.toHaveBeenCalled()
  })
})

describe('#searchIndexRebuiltController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should show each document as a result with its summary below the title', async () => {
    mockListSummaries.mockResolvedValueOnce({
      ok: true,
      data: { items: [summary()] }
    })

    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index/rebuilt?purged=0&failed=0'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(payload).toContain('Index rebuilt')
    expect(payload).toContain('A Guide')
    expect(payload).toContain('What it is about.')
    expect(payload).toContain('What it is used for.')
    expect(payload).toContain(`href="/guidance-documents/${DOCUMENT_ID}/sections/1"`)
  })

  test('Should list the terms a document would be searched by', async () => {
    mockListSummaries.mockResolvedValueOnce({
      ok: true,
      data: { items: [summary()] }
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index/rebuilt'
    })

    expect(payload).toContain('Terms: ROCR, Revenue Option Claim Rule')
  })

  test('Should list the acronym index with the sections each appears in', async () => {
    mockListSummaries.mockResolvedValueOnce({
      ok: true,
      data: { items: [summary()] }
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index/rebuilt'
    })

    expect(payload).toContain('Acronyms')
    expect(payload).toContain('SDA')
    expect(payload).toContain('Severely Disadvantaged Area')
    expect(payload).toContain('1, 1.1')
  })

  test('Should say when an acronym is never expanded rather than hiding it', async () => {
    mockListSummaries.mockResolvedValueOnce({
      ok: true,
      data: { items: [summary()] }
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index/rebuilt'
    })

    expect(payload).toContain('IAPA')
    expect(payload).toContain('not expanded in this document')
  })

  test('Should list each section under the document it belongs to', async () => {
    mockListSummaries.mockResolvedValueOnce({
      ok: true,
      data: { items: [summary()] }
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index/rebuilt'
    })

    expect(payload).toContain('Sections')
    expect(payload).toContain('1.1 Heading 1.1')
    expect(payload).toContain('What section 1.1 covers.')
    expect(payload).toContain('Terms: term-1.1')
    expect(payload).toContain(`href="/guidance-documents/${DOCUMENT_ID}/sections/1.1"`)
  })

  test('Should render a document that has no sections indexed', async () => {
    mockListSummaries.mockResolvedValueOnce({
      ok: true,
      data: { items: [summary({ sections: [], acronyms: [], keywords: [] })] }
    })

    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index/rebuilt'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(payload).not.toContain('Sections')
    expect(payload).not.toContain('Acronyms')
  })

  test('Should launch the document at the first section the index recorded', async () => {
    mockListSummaries.mockResolvedValueOnce({
      ok: true,
      data: { items: [summary({ startPath: '/guidance-documents/elsewhere/sections/2' })] }
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index/rebuilt'
    })

    expect(payload).toContain('Open this document')
    expect(payload).toContain('href="/guidance-documents/elsewhere/sections/2"')
  })

  test('Should warn when a document could not be summarised', async () => {
    mockListSummaries.mockResolvedValueOnce({
      ok: true,
      data: { items: [summary()] }
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index/rebuilt?failed=2'
    })

    expect(payload).toContain('2 document(s) could not be summarised')
  })

  test('Should report how long the rebuild took', async () => {
    mockListSummaries.mockResolvedValueOnce({
      ok: true,
      data: { items: [summary()] }
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index/rebuilt?took=110'
    })

    expect(payload).toContain('Built in 1 minute 50 seconds')
  })

  test('Should not claim a time when the rebuild was not timed', async () => {
    mockListSummaries.mockResolvedValueOnce({
      ok: true,
      data: { items: [summary()] }
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index/rebuilt?purged=3&failed=0'
    })

    expect(payload).not.toContain('Built in')
  })

  test('Should report what the rebuild discarded', async () => {
    mockListSummaries.mockResolvedValueOnce({
      ok: true,
      data: { items: [summary()] }
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index/rebuilt?purged=3'
    })

    expect(payload).toContain('3 previous summaries discarded before this rebuild')
  })

  test('Should say so when nothing is indexed', async () => {
    mockListSummaries.mockResolvedValueOnce({
      ok: true,
      data: { items: [] }
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index/rebuilt'
    })

    expect(payload).toContain('Nothing is indexed yet')
  })
})
