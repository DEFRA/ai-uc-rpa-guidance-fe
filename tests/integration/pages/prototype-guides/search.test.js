import { constants as statusCodes } from 'node:http2'
import { vi } from 'vitest'

const { mockListDocuments, mockGetManifest, mockSearchGuidance } = vi.hoisted(() => ({
  mockListDocuments: vi.fn(),
  mockGetManifest: vi.fn(),
  mockSearchGuidance: vi.fn()
}))

vi.mock('../../../../src/infra/api/guidance-api.js', () => ({
  listDocuments: mockListDocuments,
  getPrototypeGuidesManifest: mockGetManifest,
  searchGuidance: mockSearchGuidance,
  initiateUpload: vi.fn(),
  getDocument: vi.fn()
}))

import { createServer } from '../../../../src/server/server.js'

const DOCUMENT_ID = '11111111-1111-1111-1111-111111111111'

const result = (overrides = {}) => ({
  documentId: DOCUMENT_ID,
  documentTitle: 'A Guide',
  sectionNumber: '3.2',
  heading: 'SDA status',
  summary: 'What the section covers.',
  reason: 'It gives you the SDA eligibility check to make.',
  startPath: `/guidance-documents/${DOCUMENT_ID}/sections/3.2`,
  checked: true,
  ...overrides
})

const search = (overrides = {}) => ({
  ok: true,
  data: {
    query: 'sda',
    answer: {
      answer: 'Check the parcel’s SDA status on the Land tab.',
      cited: [result()]
    },
    results: [result()],
    indexedDocuments: 3,
    durationSeconds: 12.3,
    ...overrides
  }
})

const manifest = {
  'claims-guide': {
    documentId: DOCUMENT_ID,
    title: 'Claims Guide',
    latestVersion: 1,
    versions: [{ version: 1, versionId: 'v1', sections: 4, images: 0 }]
  }
}

describe('#prototypeGuidesSearch', () => {
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
    mockGetManifest.mockResolvedValue({ ok: true, data: manifest })
  })

  test('Should no longer offer a find box on the documents list page', async () => {
    mockListDocuments.mockResolvedValueOnce({
      ok: true,
      data: { items: [], total: 0, page: 1, pageSize: 10 }
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/guidance-documents'
    })

    expect(payload).not.toContain('name="q"')
  })

  test('Should move the old search page permanently to the prototype guidance page', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/guidance-documents/search?q=sda%20status'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_MOVED_PERMANENTLY)
    expect(headers.location).toBe('/prototype-guides?q=sda%20status')
  })

  test('Should put the search box at the top of the prototype guidance page', async () => {
    const { payload } = await server.inject({
      method: 'GET',
      url: '/prototype-guides'
    })

    const form = payload.indexOf('action="/prototype-guides"')
    expect(form).toBeGreaterThan(-1)
    expect(form).toBeLessThan(payload.indexOf('Claims Guide'))
    expect(payload).toContain('name="q"')
    expect(payload).toContain(
      'placeholder="Search by title or by any words the document contains or ask a question"'
    )
    expect(payload).toMatch(/<label class="govuk-label[^"]*govuk-visually-hidden[^"]*" for="q">/)
  })

  test('Should mark the search box for the find shortcut', async () => {
    const { payload } = await server.inject({
      method: 'GET',
      url: '/prototype-guides'
    })

    expect(payload).toContain('data-module="search-shortcut"')
  })

  test('Should show the results above the guide list', async () => {
    mockSearchGuidance.mockResolvedValueOnce(search())

    const { payload } = await server.inject({
      method: 'GET',
      url: '/prototype-guides?q=sda'
    })

    expect(payload.indexOf('3.2 SDA status')).toBeLessThan(payload.indexOf('Guides in the manifest'))
    expect(payload).toContain('value="sda"')
  })

  test('Should engage the search agent with what was typed', async () => {
    mockSearchGuidance.mockResolvedValueOnce(search())

    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/prototype-guides?q=sda%20status'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(mockSearchGuidance).toHaveBeenCalledWith('sda status')
  })

  test('Should show the AI summary above the results, with its sources', async () => {
    mockSearchGuidance.mockResolvedValueOnce(search())

    const { payload } = await server.inject({
      method: 'GET',
      url: '/prototype-guides?q=sda'
    })

    expect(payload).toContain('AI summary')
    expect(payload).toContain('Check the parcel')
    expect(payload).toContain('Taken from:')
    expect(payload).toContain(`href="/guidance-documents/${DOCUMENT_ID}/sections/3.2"`)
  })

  test('Should deep link each result into the viewer', async () => {
    mockSearchGuidance.mockResolvedValueOnce(search())

    const { payload } = await server.inject({
      method: 'GET',
      url: '/prototype-guides?q=sda'
    })

    expect(payload).toContain('1 result')
    expect(payload).toContain('3.2 SDA status')
    expect(payload).toContain('It gives you the SDA eligibility check to make.')
    expect(payload).toContain(`href="/guidance-documents/${DOCUMENT_ID}/sections/3.2"`)
  })

  test('Should render results with no answer rather than an empty block', async () => {
    mockSearchGuidance.mockResolvedValueOnce(search({ answer: null }))

    const { payload } = await server.inject({
      method: 'GET',
      url: '/prototype-guides?q=sda'
    })

    expect(payload).not.toContain('AI summary')
    expect(payload).toContain('3.2 SDA status')
  })

  test('Should say so when nothing matches', async () => {
    mockSearchGuidance.mockResolvedValueOnce(
      search({ answer: null, results: [] })
    )

    const { payload } = await server.inject({
      method: 'GET',
      url: '/prototype-guides?q=nothing%20matches'
    })

    expect(payload).toContain('No results')
    expect(payload).toContain('nothing matches')
  })

  test('Should link a whole-document result by its title', async () => {
    mockSearchGuidance.mockResolvedValueOnce(
      search({
        answer: null,
        results: [
          result({
            sectionNumber: null,
            heading: 'A Guide',
            startPath: `/guidance-documents/${DOCUMENT_ID}/sections/1`
          })
        ]
      })
    )

    const { payload } = await server.inject({
      method: 'GET',
      url: '/prototype-guides?q=a%20guide'
    })

    expect(payload).toContain('A Guide')
    expect(payload).toContain(`href="/guidance-documents/${DOCUMENT_ID}/sections/1"`)
  })

  test('Should not engage the agent for an empty box', async () => {
    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: '/prototype-guides?q='
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(payload).not.toContain('No results')
    expect(mockSearchGuidance).not.toHaveBeenCalled()
  })
})
