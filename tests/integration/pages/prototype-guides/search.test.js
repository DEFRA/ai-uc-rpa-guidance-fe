import { constants as statusCodes } from 'node:http2'
import { vi } from 'vitest'

const { mockListDocuments, mockGetManifest, mockGetSections, mockSearchGuidance } = vi.hoisted(() => ({
  mockListDocuments: vi.fn(),
  mockGetManifest: vi.fn(),
  mockGetSections: vi.fn(),
  mockSearchGuidance: vi.fn()
}))

vi.mock('../../../../src/infra/api/guidance-api.js', () => ({
  listDocuments: mockListDocuments,
  getPrototypeGuidesManifest: mockGetManifest,
  getPrototypeGuideSections: mockGetSections,
  searchGuidance: mockSearchGuidance,
  initiateUpload: vi.fn(),
  getDocument: vi.fn()
}))

import { createServer } from '../../../../src/server/server.js'

const DOCUMENT_ID = '11111111-1111-1111-1111-111111111111'

// "what is sda?", which reads as a question for the AI search.
const QUESTION = 'what%20is%20sda%3F'

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
      url: `/prototype-guides?q=${QUESTION}`
    })

    expect(payload.indexOf('3.2 SDA status')).toBeLessThan(payload.indexOf('Guides in the manifest'))
    expect(payload).toContain('value="what is sda?"')
  })

  test('Should engage the search agent with a question', async () => {
    mockSearchGuidance.mockResolvedValueOnce(search())

    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/prototype-guides?q=how%20do%20I%20check%20sda%20status'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(mockSearchGuidance).toHaveBeenCalledWith('how do I check sda status')
    expect(mockGetSections).not.toHaveBeenCalled()
  })

  test('Should show the AI summary above the results, with its sources', async () => {
    mockSearchGuidance.mockResolvedValueOnce(search())

    const { payload } = await server.inject({
      method: 'GET',
      url: `/prototype-guides?q=${QUESTION}`
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
      url: `/prototype-guides?q=${QUESTION}`
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
      url: `/prototype-guides?q=${QUESTION}`
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
      url: '/prototype-guides?q=what%20matches%20nothing%3F'
    })

    expect(payload).toContain('No results')
    expect(payload).toContain('what matches nothing?')
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
      url: '/prototype-guides?q=what%20is%20a%20guide'
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

  describe('with words to find rather than a question', () => {
    const sections = {
      introduction: '# Claims Guide\n\nAbout SDA.\n',
      sections: [
        { number: '3', heading: 'Land', level: 1, markdown: '## 3 Land\n\nCheck the SDA status once.\n' },
        { number: '3.2', heading: 'SDA status', level: 2, markdown: '### 3.2 SDA status\n\nThe SDA status, and SDA rules.\n' },
        { number: '4', heading: 'Letters', level: 1, markdown: '## 4 Letters\n\nNothing here.\n' }
      ]
    }

    const find = async (words) => {
      mockGetSections.mockResolvedValue({ ok: true, data: sections })

      return server.inject({ method: 'GET', url: `/prototype-guides?q=${words}` })
    }

    test('Should search every guide\'s sections, not engage the search agent', async () => {
      const { statusCode } = await find('sda%20status')

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(mockSearchGuidance).not.toHaveBeenCalled()
      expect(mockGetSections).toHaveBeenCalledWith(DOCUMENT_ID)
    })

    test('Should show no AI summary', async () => {
      const { payload } = await find('sda%20status')

      expect(payload).not.toContain('AI summary')
    })

    test('Should list the sections holding the words, the most matches first, with how many', async () => {
      const { payload } = await find('sda%20status')

      expect(payload).toContain('2 results')
      expect(payload.indexOf('3.2 SDA status')).toBeLessThan(payload.indexOf('3 Land'))
      expect(payload).toContain('2 matches')
      expect(payload).toMatch(/· 1 match\s*</)
    })

    test('Should open each result in the guide, searching for the same words, at its section', async () => {
      const { payload } = await find('sda%20status')

      // The section in the address too: the stepper must open at its step.
      expect(payload).toContain(`href="/prototype-guides/${DOCUMENT_ID}?keywords=sda%20status&amp;section=3.2#section-3.2"`)
      expect(payload).toContain(`href="/prototype-guides/${DOCUMENT_ID}?keywords=sda%20status&amp;section=3#section-3"`)
    })

    test('Should show the first sentence holding the words in each section, the words highlighted', async () => {
      const { payload } = await find('sda%20status')

      expect(payload).toContain('Check the <mark class="app-keyword-match">SDA status</mark> once.')
      expect(payload).toContain('The <mark class="app-keyword-match">SDA status</mark>, and SDA rules.')
    })

    test('Should say so when no section holds the words', async () => {
      const { payload } = await find('bovine')

      expect(payload).toContain('No results')
      expect(payload).toContain('bovine')
    })
  })
})
