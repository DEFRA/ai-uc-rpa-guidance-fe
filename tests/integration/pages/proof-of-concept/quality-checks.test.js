import { constants as statusCodes } from 'node:http2'
import { vi } from 'vitest'

const { mockGetManifest, mockStartQualityCheck, mockGetLatestQualityCheck } = vi.hoisted(() => ({
  mockGetManifest: vi.fn(),
  mockStartQualityCheck: vi.fn(),
  mockGetLatestQualityCheck: vi.fn()
}))

vi.mock('../../../../src/infra/api/guidance-api.js', () => ({
  getPrototypeGuidesManifest: mockGetManifest,
  startQualityCheck: mockStartQualityCheck,
  getLatestQualityCheck: mockGetLatestQualityCheck
}))

import { createServer } from '../../../../src/server/server.js'

const CLAIMS_ID = '9846c231-d74b-4ca5-b66a-f3e064fed0df'
const LAND_USE_ID = '48b8a1df-c71b-4de3-ac73-7c672aaf5456'

const manifest = {
  'claims-guide': {
    documentId: CLAIMS_ID,
    title: 'Claims Guide'
  },
  'land-use-guide': {
    documentId: LAND_USE_ID,
    title: 'Land Use Guide'
  }
}

const notFound = { ok: false, status: statusCodes.HTTP_STATUS_NOT_FOUND, data: null }

const latestCheck = (status, progress = {}) => ({
  ok: true,
  status: statusCodes.HTTP_STATUS_OK,
  data: { jobId: 'job-1', status, updatedAt: '2026-10-19T19:25:10Z', ...progress }
})

describe('#qualityChecks', () => {
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

  describe('GET /proof-of-concept/quality-checks', () => {
    test('Should list a prototype guide never checked as not run', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })
      mockGetLatestQualityCheck.mockResolvedValue(notFound)

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/proof-of-concept/quality-checks'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Prototype quality checks')
      expect(payload).toContain('Claims Guide')
      expect(payload).toContain('Land Use Guide')
      expect(payload.split('Not run')).toHaveLength(3)
    })

    test('Should show the status and date of each guide\'s latest check', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })
      mockGetLatestQualityCheck.mockImplementation(async (documentId) =>
        documentId === CLAIMS_ID ? latestCheck('completed') : latestCheck('running')
      )

      const { payload } = await server.inject({
        method: 'GET',
        url: '/proof-of-concept/quality-checks'
      })

      expect(mockGetLatestQualityCheck).toHaveBeenCalledWith(CLAIMS_ID)
      expect(mockGetLatestQualityCheck).toHaveBeenCalledWith(LAND_USE_ID)
      expect(payload).toContain('Completed')
      expect(payload).toContain('Running')
      expect(payload).toContain('2026-10-19')
      expect(payload).not.toContain('Not run')
    })

    test('Should show how many sections a running check has finished', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: { 'land-use-guide': manifest['land-use-guide'] } })
      mockGetLatestQualityCheck.mockResolvedValue(latestCheck('running', { sectionsDone: 3, sectionsTotal: 6 }))

      const { payload } = await server.inject({
        method: 'GET',
        url: '/proof-of-concept/quality-checks'
      })

      expect(payload).toContain('3/6 sections')
    })

    test('Should show no section count once a check has finished', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: { 'land-use-guide': manifest['land-use-guide'] } })
      mockGetLatestQualityCheck.mockResolvedValue(latestCheck('completed', { sectionsDone: 6, sectionsTotal: 6 }))

      const { payload } = await server.inject({
        method: 'GET',
        url: '/proof-of-concept/quality-checks'
      })

      expect(payload).not.toContain('6/6 sections')
    })

    test('Should link to the start page', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })
      mockGetLatestQualityCheck.mockResolvedValue(notFound)

      const { payload } = await server.inject({
        method: 'GET',
        url: '/proof-of-concept/quality-checks'
      })

      expect(payload).toContain('href="/proof-of-concept/quality-checks/start"')
      expect(payload).toContain('Start a quality check')
    })

    test('Should say so when no prototype guides have been uploaded', async () => {
      mockGetManifest.mockResolvedValueOnce(notFound)

      const { payload } = await server.inject({
        method: 'GET',
        url: '/proof-of-concept/quality-checks'
      })

      expect(payload).toContain('No prototype guides have been uploaded yet.')
    })
  })

  describe('GET /proof-of-concept/quality-checks/start', () => {
    test('Should offer every prototype guide to select', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/proof-of-concept/quality-checks/start'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Start a quality check')
      expect(payload).toContain(`<option value="${CLAIMS_ID}">Claims Guide</option>`)
      expect(payload).toContain(`<option value="${LAND_USE_ID}">Land Use Guide</option>`)
    })

    test('Should post the selected guide to start the check', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

      const { payload } = await server.inject({
        method: 'GET',
        url: '/proof-of-concept/quality-checks/start'
      })

      expect(payload).toContain('<form method="post" action="/proof-of-concept/quality-checks/start">')
      expect(payload).toContain('<button type="submit" class="govuk-button" data-module="govuk-button">\n  Start quality check\n</button>')
    })

    test('Should point to the upload page when no prototype guides have been uploaded', async () => {
      mockGetManifest.mockResolvedValueOnce(notFound)

      const { payload } = await server.inject({
        method: 'GET',
        url: '/proof-of-concept/quality-checks/start'
      })

      expect(payload).toContain('No prototype guides are available to check.')
      expect(payload).toContain('href="/prototype-guides/upload"')
      expect(payload).not.toContain('Start quality check')
    })
  })

  describe('POST /proof-of-concept/quality-checks/start', () => {
    test('Should start the check and show its confirmation', async () => {
      mockStartQualityCheck.mockResolvedValueOnce({
        ok: true,
        status: statusCodes.HTTP_STATUS_ACCEPTED,
        data: { jobId: 'job-999', status: 'pending' }
      })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/proof-of-concept/quality-checks/start',
        payload: { documentId: LAND_USE_ID, _csrf: '' }
      })

      expect(mockStartQualityCheck).toHaveBeenCalledWith(LAND_USE_ID)
      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe('/proof-of-concept/quality-checks/confirmation?jobId=job-999')
    })

    test('Should ask for a guide when none was selected', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

      const { statusCode, payload } = await server.inject({
        method: 'POST',
        url: '/proof-of-concept/quality-checks/start',
        payload: { documentId: '' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
      expect(payload).toContain('There is a problem')
      expect(payload).toContain('Select a document to check')
      expect(mockStartQualityCheck).not.toHaveBeenCalled()
    })

    test('Should say so when the guide can no longer be found', async () => {
      mockStartQualityCheck.mockResolvedValueOnce(notFound)
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

      const { statusCode, payload } = await server.inject({
        method: 'POST',
        url: '/proof-of-concept/quality-checks/start',
        payload: { documentId: LAND_USE_ID }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('The selected document could not be found. Select another.')
    })
  })

  describe('GET /proof-of-concept/quality-checks/confirmation', () => {
    test('Should confirm the check started, with its job reference', async () => {
      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/proof-of-concept/quality-checks/confirmation?jobId=job-abc'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Quality check started')
      expect(payload).toContain('job-abc')
      expect(payload).toContain('href="/proof-of-concept/quality-checks"')
    })
  })
})
