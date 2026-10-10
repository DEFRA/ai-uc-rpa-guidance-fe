import { constants as statusCodes } from 'node:http2'
import { vi } from 'vitest'

const {
  mockGetManifest,
  mockGetGuideSections,
  mockGetGuideSection,
  mockListSummaries,
  mockRebuildSummaries,
  mockGetSummaryRebuild,
  mockGetCurrentSummaryRebuild,
  mockCancelSummaryRebuild
} = vi.hoisted(() => ({
  mockGetManifest: vi.fn(),
  mockGetGuideSections: vi.fn(),
  mockGetGuideSection: vi.fn(),
  mockListSummaries: vi.fn(),
  mockRebuildSummaries: vi.fn(),
  mockGetSummaryRebuild: vi.fn(),
  mockGetCurrentSummaryRebuild: vi.fn(),
  mockCancelSummaryRebuild: vi.fn()
}))

vi.mock('../../../../src/infra/api/guidance-api.js', () => ({
  getPrototypeGuidesManifest: mockGetManifest,
  getPrototypeGuideSections: mockGetGuideSections,
  getPrototypeGuideSection: mockGetGuideSection,
  listSummaries: mockListSummaries,
  rebuildSummaries: mockRebuildSummaries,
  getSummaryRebuild: mockGetSummaryRebuild,
  getCurrentSummaryRebuild: mockGetCurrentSummaryRebuild,
  cancelSummaryRebuild: mockCancelSummaryRebuild,
  initiateUpload: vi.fn(),
  getDocument: vi.fn()
}))

import { createServer } from '../../../../src/server/server.js'

const DOCUMENT_ID = '11111111-1111-1111-1111-111111111111'
const REBUILD_ID = '22222222-2222-2222-2222-222222222222'
const NEW_REBUILD_ID = '33333333-3333-3333-3333-333333333333'
const conflict = { ok: false, status: 409, data: null }

const manifest = {
  'a-guide': {
    documentId: DOCUMENT_ID,
    title: 'A Guide',
    latestVersion: 1,
    versions: [{ version: 1, versionId: 'v1', sections: 2, images: 0 }]
  }
}

const notFound = { ok: false, status: statusCodes.HTTP_STATUS_NOT_FOUND, data: null }

const rebuild = (overrides = {}) => ({
  rebuildId: REBUILD_ID,
  status: 'running',
  total: 17,
  completed: 3,
  currentTitle: 'Final Payment Case Check Guide',
  failures: [],
  purged: 3,
  durationSeconds: null,
  ...overrides
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

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCurrentSummaryRebuild.mockResolvedValue(notFound)
  })

  test('Should list every prototype guide and the ways to index them', async () => {
    mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(payload).toContain('A Guide')
    expect(payload).not.toContain('name="documentIds"')
    expect(payload).toContain('Index new and changed guides')
  })

  test('Should say so when there is nothing to index', async () => {
    mockGetManifest.mockResolvedValueOnce(notFound)

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index'
    })

    expect(payload).toContain('There are no prototype guides to index')
    expect(payload).not.toContain('Index new and changed guides')
  })

  test('Should stay off the service navigation', async () => {
    mockGetManifest.mockResolvedValueOnce(notFound)

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index'
    })

    expect(payload).not.toContain('defra-service-navigation__link" href="/admin')
  })

  test('Should explain the difference between the two ways to index', async () => {
    mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index'
    })

    expect(payload).toContain('only the guides that are new or have changed')
    expect(payload).toContain('empties the index first')
    expect(payload).toContain('in the background')
  })

  test('Should offer to index new and changed guides first, and a whole rebuild second', async () => {
    mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index'
    })

    const buttons = [...payload.matchAll(/<button([^>]*)>\s*([^<]*?)\s*<\/button>/g)]
      .map(([, attributes, text]) => ({ attributes, text }))
    const partial = buttons.findIndex((b) => b.text === 'Index new and changed guides')
    const full = buttons.findIndex((b) => b.text === 'Rebuild the whole index')

    expect(partial).toBeGreaterThan(-1)
    expect(full).toBeGreaterThan(partial)
    expect(buttons[partial].attributes).toMatch(/name="mode"/)
    expect(buttons[partial].attributes).toMatch(/value="partial"/)
    expect(buttons[full].attributes).toMatch(/value="full"/)
    expect(buttons[full].attributes).toMatch(/govuk-button--warning/)
  })

  test.each(['partial', 'full'])('Should start a %s rebuild and redirect to its progress', async (mode) => {
    mockRebuildSummaries.mockResolvedValueOnce({
      ok: true,
      status: statusCodes.HTTP_STATUS_ACCEPTED,
      data: rebuild({ status: 'queued', completed: 0, currentTitle: null, mode })
    })

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: '/admin/search-index/rebuild',
      payload: { mode }
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
    expect(headers.location).toBe(`/admin/search-index/rebuilds/${REBUILD_ID}`)
    expect(mockRebuildSummaries).toHaveBeenCalledWith(mode)
  })

  test('Should refuse a mode it does not know', async () => {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/admin/search-index/rebuild',
      payload: { mode: 'everything' }
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
    expect(mockRebuildSummaries).not.toHaveBeenCalled()
  })

  test('Should index only new and changed guides when no mode is given', async () => {
    mockRebuildSummaries.mockResolvedValueOnce({ ok: true, status: 202, data: rebuild() })

    await server.inject({ method: 'POST', url: '/admin/search-index/rebuild' })

    expect(mockRebuildSummaries).toHaveBeenCalledWith('partial')
  })

  test('Should follow the rebuild already running rather than start another', async () => {
    mockRebuildSummaries.mockResolvedValueOnce(conflict)
    mockGetCurrentSummaryRebuild.mockResolvedValueOnce({ ok: true, data: rebuild() })

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: '/admin/search-index/rebuild'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
    expect(headers.location).toBe(`/admin/search-index/rebuilds/${REBUILD_ID}`)
  })

  test('Should start the rebuild again when the one in its way has just finished', async () => {
    mockRebuildSummaries
      .mockResolvedValueOnce(conflict)
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        data: rebuild({ rebuildId: NEW_REBUILD_ID, status: 'queued' })
      })
    mockGetCurrentSummaryRebuild.mockResolvedValueOnce(notFound)

    const { headers } = await server.inject({
      method: 'POST',
      url: '/admin/search-index/rebuild'
    })

    expect(mockRebuildSummaries).toHaveBeenCalledTimes(2)
    expect(headers.location).toBe(`/admin/search-index/rebuilds/${NEW_REBUILD_ID}`)
  })

  test('Should say so when a rebuild is in the way and cannot be followed', async () => {
    mockRebuildSummaries.mockResolvedValueOnce(conflict).mockResolvedValueOnce(conflict)
    mockGetCurrentSummaryRebuild.mockResolvedValueOnce(notFound)
    mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

    const { statusCode, payload } = await server.inject({
      method: 'POST',
      url: '/admin/search-index/rebuild'
    })

    expect(mockRebuildSummaries).toHaveBeenCalledTimes(2)
    expect(statusCode).toBe(statusCodes.HTTP_STATUS_CONFLICT)
    expect(payload).toContain('The index is already being rebuilt')
  })

  test('Should say when the index is being rebuilt, with the way to its progress', async () => {
    mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })
    mockGetCurrentSummaryRebuild.mockResolvedValueOnce({ ok: true, data: rebuild() })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index'
    })

    expect(payload).toContain('govuk-notification-banner')
    expect(payload).toContain('The index is being rebuilt')
    expect(payload).toContain(`href="/admin/search-index/rebuilds/${REBUILD_ID}"`)
    expect(payload).toContain('See the progress')
  })

  test('Should show no banner when no rebuild is running', async () => {
    mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index'
    })

    expect(payload).not.toContain('The index is being rebuilt')
  })
})

describe('#searchIndexCancelAndRebuildController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSummaryRebuild.mockResolvedValue(notFound)
  })

  test.each(['partial', 'full'])('Should start the new rebuild as %s, as the one cancelled was', async (mode) => {
    mockCancelSummaryRebuild.mockResolvedValueOnce({ ok: true, data: rebuild({ status: 'cancelled', mode }) })
    mockRebuildSummaries.mockResolvedValueOnce({
      ok: true,
      status: 202,
      data: rebuild({ rebuildId: NEW_REBUILD_ID, status: 'queued', mode })
    })

    await server.inject({
      method: 'POST',
      url: `/admin/search-index/rebuilds/${REBUILD_ID}/cancel-and-rebuild`
    })

    expect(mockRebuildSummaries).toHaveBeenCalledWith(mode)
  })

  test('Should keep the mode of a rebuild that finished before it could be cancelled', async () => {
    mockCancelSummaryRebuild.mockResolvedValueOnce(conflict)
    mockGetSummaryRebuild.mockResolvedValueOnce({ ok: true, data: rebuild({ status: 'complete', mode: 'full' }) })
    mockRebuildSummaries.mockResolvedValueOnce({
      ok: true,
      status: 202,
      data: rebuild({ rebuildId: NEW_REBUILD_ID, status: 'queued', mode: 'full' })
    })

    await server.inject({
      method: 'POST',
      url: `/admin/search-index/rebuilds/${REBUILD_ID}/cancel-and-rebuild`
    })

    expect(mockRebuildSummaries).toHaveBeenCalledWith('full')
  })

  test('Should cancel the rebuild, start another and follow it', async () => {
    mockCancelSummaryRebuild.mockResolvedValueOnce({ ok: true, data: rebuild({ status: 'cancelled' }) })
    mockRebuildSummaries.mockResolvedValueOnce({
      ok: true,
      status: 202,
      data: rebuild({ rebuildId: NEW_REBUILD_ID, status: 'queued' })
    })

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: `/admin/search-index/rebuilds/${REBUILD_ID}/cancel-and-rebuild`
    })

    expect(mockCancelSummaryRebuild).toHaveBeenCalledWith(REBUILD_ID)
    expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
    expect(headers.location).toBe(`/admin/search-index/rebuilds/${NEW_REBUILD_ID}`)
  })

  test.each([
    ['unknown', notFound],
    ['no longer running', conflict]
  ])('Should rebuild anyway when the rebuild to cancel is %s', async (_name, answer) => {
    mockCancelSummaryRebuild.mockResolvedValueOnce(answer)
    mockRebuildSummaries.mockResolvedValueOnce({
      ok: true,
      status: 202,
      data: rebuild({ rebuildId: NEW_REBUILD_ID, status: 'queued' })
    })

    const { headers } = await server.inject({
      method: 'POST',
      url: `/admin/search-index/rebuilds/${REBUILD_ID}/cancel-and-rebuild`
    })

    expect(headers.location).toBe(`/admin/search-index/rebuilds/${NEW_REBUILD_ID}`)
  })

  test('Should follow the rebuild that is still in the way', async () => {
    mockCancelSummaryRebuild.mockResolvedValueOnce(conflict)
    mockRebuildSummaries.mockResolvedValueOnce(conflict)
    mockGetCurrentSummaryRebuild.mockResolvedValueOnce({
      ok: true,
      data: rebuild({ rebuildId: NEW_REBUILD_ID })
    })

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: `/admin/search-index/rebuilds/${REBUILD_ID}/cancel-and-rebuild`
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
    expect(headers.location).toBe(`/admin/search-index/rebuilds/${NEW_REBUILD_ID}`)
  })

  test('Should show not found for an id that is not a rebuild id', async () => {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/admin/search-index/rebuilds/not%20an%20id/cancel-and-rebuild'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    expect(mockCancelSummaryRebuild).not.toHaveBeenCalled()
  })
})

describe('#searchIndexRebuildProgressController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Should show which guide is being indexed and how far it has got', async () => {
    mockGetSummaryRebuild.mockResolvedValueOnce({ ok: true, data: rebuild() })

    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: `/admin/search-index/rebuilds/${REBUILD_ID}`
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(payload).toContain('Indexing Final Payment Case Check Guide - 3 of 17 documents')
    expect(payload).toMatch(/<progress[^>]*max="17"[^>]*value="3"/)
    expect(mockGetSummaryRebuild).toHaveBeenCalledWith(REBUILD_ID)
  })

  test('Should refresh the whole page only when scripts do not run', async () => {
    mockGetSummaryRebuild.mockResolvedValueOnce({ ok: true, data: rebuild() })

    const { payload } = await server.inject({
      method: 'GET',
      url: `/admin/search-index/rebuilds/${REBUILD_ID}`
    })

    expect(payload).toMatch(/<noscript>\s*<meta http-equiv="refresh" content="2">\s*<\/noscript>/)
  })

  test('Should mark the progress for the script to follow, with a live label', async () => {
    mockGetSummaryRebuild.mockResolvedValueOnce({ ok: true, data: rebuild() })

    const { payload } = await server.inject({
      method: 'GET',
      url: `/admin/search-index/rebuilds/${REBUILD_ID}`
    })

    expect(payload).toContain('data-module="rebuild-progress"')
    expect(payload).toContain(`data-status-url="/admin/search-index/rebuilds/${REBUILD_ID}/status"`)
    expect(payload).toMatch(/aria-live="polite"[^>]*data-rebuild-progress-label|data-rebuild-progress-label[^>]*aria-live="polite"/)
  })

  test('Should say it is starting before any guide has begun', async () => {
    mockGetSummaryRebuild.mockResolvedValueOnce({
      ok: true,
      data: rebuild({ status: 'queued', completed: 0, currentTitle: null })
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: `/admin/search-index/rebuilds/${REBUILD_ID}`
    })

    expect(payload).toContain('Starting to index 17 documents')
  })

  test.each(['complete', 'failed'])(
    'Should go to the confirmation when the rebuild is %s',
    async (status) => {
      mockGetSummaryRebuild.mockResolvedValueOnce({
        ok: true,
        data: rebuild({
          status,
          completed: 17,
          failures: [{ documentId: DOCUMENT_ID, title: 'A Guide', errorMessage: 'boom' }],
          durationSeconds: 110.4
        })
      })

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: `/admin/search-index/rebuilds/${REBUILD_ID}`
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe(
        '/admin/search-index/rebuilt?purged=3&failed=1&took=110.4&skipped=0'
      )
    }
  )

  test('Should offer to cancel and reindex while the rebuild runs', async () => {
    mockGetSummaryRebuild.mockResolvedValueOnce({ ok: true, data: rebuild() })

    const { payload } = await server.inject({
      method: 'GET',
      url: `/admin/search-index/rebuilds/${REBUILD_ID}`
    })

    expect(payload).toContain(`action="/admin/search-index/rebuilds/${REBUILD_ID}/cancel-and-rebuild"`)
    expect(payload).toContain('Cancel the current rebuild and reindex')
  })

  test('Should say the rebuild was cancelled, and stop following it', async () => {
    mockGetSummaryRebuild.mockResolvedValueOnce({
      ok: true,
      data: rebuild({ status: 'cancelled' })
    })

    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: `/admin/search-index/rebuilds/${REBUILD_ID}`
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(payload).toContain('The rebuild was cancelled')
    expect(payload).toContain('href="/admin/search-index"')
    expect(payload).not.toContain('http-equiv="refresh"')
    expect(payload).not.toContain('cancel-and-rebuild')
  })

  test('Should go straight to the confirmation when every guide was already indexed', async () => {
    mockGetSummaryRebuild.mockResolvedValueOnce({
      ok: true,
      data: rebuild({ mode: 'partial', status: 'complete', total: 17, completed: 17, skipped: 17, purged: 0, durationSeconds: 0.1 })
    })

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: `/admin/search-index/rebuilds/${REBUILD_ID}`
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
    expect(headers.location).toBe('/admin/search-index/rebuilt?purged=0&failed=0&took=0.1&skipped=17')
  })

  test('Should open the bar past the guides already indexed', async () => {
    mockGetSummaryRebuild.mockResolvedValueOnce({
      ok: true,
      data: rebuild({ total: 17, completed: 16, skipped: 16 })
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: `/admin/search-index/rebuilds/${REBUILD_ID}`
    })

    expect(payload).toMatch(/<progress[^>]*max="17"[^>]*value="16"/)
    expect(payload).toContain('Indexing Final Payment Case Check Guide - 16 of 17 documents (16 already indexed)')
  })

  test('Should show not found for a rebuild the API does not know', async () => {
    mockGetSummaryRebuild.mockResolvedValueOnce(notFound)

    const { statusCode } = await server.inject({
      method: 'GET',
      url: `/admin/search-index/rebuilds/${REBUILD_ID}`
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
  })

  test('Should show not found for an id that is not a rebuild id', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/admin/search-index/rebuilds/not%20an%20id'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    expect(mockGetSummaryRebuild).not.toHaveBeenCalled()
  })
})

describe('#searchIndexRebuildStatusController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const status = (url) => server.inject({ method: 'GET', url })

  test('Should report a running rebuild with the label the page shows', async () => {
    mockGetSummaryRebuild.mockResolvedValueOnce({ ok: true, data: rebuild() })

    const { statusCode, result } = await status(`/admin/search-index/rebuilds/${REBUILD_ID}/status`)

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(result).toEqual({
      status: 'running',
      completed: 3,
      total: 17,
      label: 'Indexing Final Payment Case Check Guide - 3 of 17 documents',
      doneUrl: null
    })
    expect(mockGetSummaryRebuild).toHaveBeenCalledWith(REBUILD_ID)
  })

  test('Should count guides already indexed as done, and say so', async () => {
    mockGetSummaryRebuild.mockResolvedValueOnce({
      ok: true,
      data: rebuild({ mode: 'partial', total: 17, completed: 16, skipped: 16 })
    })

    const { result } = await status(`/admin/search-index/rebuilds/${REBUILD_ID}/status`)

    expect(result.completed).toBe(16)
    expect(result.total).toBe(17)
    expect(result.label).toBe('Indexing Final Payment Case Check Guide - 16 of 17 documents (16 already indexed)')
  })

  test('Should label a rebuild that has not started a guide yet', async () => {
    mockGetSummaryRebuild.mockResolvedValueOnce({
      ok: true,
      data: rebuild({ status: 'queued', completed: 0, currentTitle: null })
    })

    const { result } = await status(`/admin/search-index/rebuilds/${REBUILD_ID}/status`)

    expect(result.label).toBe('Starting to index 17 documents')
  })

  test.each(['complete', 'failed'])('Should give the confirmation to go to when %s', async (state) => {
    mockGetSummaryRebuild.mockResolvedValueOnce({
      ok: true,
      data: rebuild({
        status: state,
        completed: 17,
        failures: [{ documentId: DOCUMENT_ID, title: 'A Guide', errorMessage: 'boom' }],
        durationSeconds: 110.4
      })
    })

    const { result } = await status(`/admin/search-index/rebuilds/${REBUILD_ID}/status`)

    expect(result.status).toBe(state)
    expect(result.doneUrl).toBe('/admin/search-index/rebuilt?purged=3&failed=1&took=110.4&skipped=0')
  })

  test('Should give no confirmation for a cancelled rebuild', async () => {
    mockGetSummaryRebuild.mockResolvedValueOnce({ ok: true, data: rebuild({ status: 'cancelled' }) })

    const { result } = await status(`/admin/search-index/rebuilds/${REBUILD_ID}/status`)

    expect(result.status).toBe('cancelled')
    expect(result.doneUrl).toBeNull()
  })

  test('Should answer not found for a rebuild the API does not know', async () => {
    mockGetSummaryRebuild.mockResolvedValueOnce(notFound)

    const { statusCode } = await status(`/admin/search-index/rebuilds/${REBUILD_ID}/status`)

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
  })

  test('Should answer not found for an id that is not a rebuild id', async () => {
    const { statusCode } = await status('/admin/search-index/rebuilds/not%20an%20id/status')

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    expect(mockGetSummaryRebuild).not.toHaveBeenCalled()
  })
})

describe('#prototypeGuideReaderController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Should show a whole guide at the path the index links to', async () => {
    mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })
    mockGetGuideSections.mockResolvedValueOnce({
      ok: true,
      data: {
        introduction: '# A Guide\n',
        sections: [
          { number: '1', heading: 'Background', level: 1, markdown: '## 1 Background\n\nWhy it matters.\n' }
        ]
      }
    })

    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: `/prototype/guides/${DOCUMENT_ID}/content`
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(payload).toContain('A Guide')
    expect(payload).toContain('Why it matters.')
  })

  test('Should show one section of a guide at the path the index links to', async () => {
    mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })
    mockGetGuideSection.mockResolvedValueOnce({
      ok: true,
      data: '### 2.1 Allocating a Quality Check\n\nPick a case.\n'
    })

    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: `/prototype/guides/${DOCUMENT_ID}/sections/2.1`
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(payload).toContain('A Guide')
    expect(payload).toContain('Allocating a Quality Check')
    expect(payload).toContain('Pick a case.')
    expect(payload).toContain(`href="/prototype/guides/${DOCUMENT_ID}/content"`)
    expect(mockGetGuideSection).toHaveBeenCalledWith(DOCUMENT_ID, '2.1')
  })

  test('Should show not found for a section the guide does not have', async () => {
    mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })
    mockGetGuideSection.mockResolvedValueOnce(notFound)

    const { statusCode } = await server.inject({
      method: 'GET',
      url: `/prototype/guides/${DOCUMENT_ID}/sections/99`
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
  })

  test('Should show not found for a guide that is not in the manifest', async () => {
    mockGetManifest.mockResolvedValueOnce(notFound)

    const { statusCode } = await server.inject({
      method: 'GET',
      url: `/prototype/guides/${DOCUMENT_ID}/content`
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
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

  test('Should report how many guides were up to date', async () => {
    mockListSummaries.mockResolvedValueOnce({
      ok: true,
      data: { items: [summary()] }
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index/rebuilt?skipped=16'
    })

    expect(payload).toContain('16 guides were already up to date')
  })

  test('Should not mention up to date guides when there were none', async () => {
    mockListSummaries.mockResolvedValueOnce({
      ok: true,
      data: { items: [summary()] }
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/admin/search-index/rebuilt?skipped=0'
    })

    expect(payload).not.toContain('up to date')
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
