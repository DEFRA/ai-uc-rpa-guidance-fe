import { constants as statusCodes } from 'node:http2'
import { vi } from 'vitest'

const { mockListDocuments, mockSearchGuidance } = vi.hoisted(() => ({
  mockListDocuments: vi.fn(),
  mockSearchGuidance: vi.fn()
}))

vi.mock('../../../../src/infra/api/guidance-api.js', () => ({
  listDocuments: mockListDocuments,
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

describe('#guidanceDocumentSearchController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should offer a find box on the documents list page', async () => {
    mockListDocuments.mockResolvedValueOnce({
      ok: true,
      data: { items: [], total: 0, page: 1, pageSize: 10 }
    })

    const { payload } = await server.inject({
      method: 'GET',
      url: '/guidance-documents'
    })

    expect(payload).toContain('action="/guidance-documents/search"')
    expect(payload).toContain('name="q"')
    expect(payload).toContain('Find guidance')
  })

  test('Should engage the search agent with what was typed', async () => {
    mockSearchGuidance.mockResolvedValueOnce(search())

    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/guidance-documents/search?q=sda%20status'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(mockSearchGuidance).toHaveBeenCalledWith('sda status')
  })

  test('Should show the AI summary above the results, with its sources', async () => {
    mockSearchGuidance.mockResolvedValueOnce(search())

    const { payload } = await server.inject({
      method: 'GET',
      url: '/guidance-documents/search?q=sda'
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
      url: '/guidance-documents/search?q=sda'
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
      url: '/guidance-documents/search?q=sda'
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
      url: '/guidance-documents/search?q=nothing%20matches'
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
      url: '/guidance-documents/search?q=a%20guide'
    })

    expect(payload).toContain('A Guide')
    expect(payload).toContain(`href="/guidance-documents/${DOCUMENT_ID}/sections/1"`)
  })

  test('Should not engage the agent for an empty box', async () => {
    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: '/guidance-documents/search'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(payload).toContain('Search guidance')
    expect(payload).not.toContain('No results')
    expect(mockSearchGuidance).not.toHaveBeenCalled()
  })
})
