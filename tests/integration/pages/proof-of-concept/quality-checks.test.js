import { constants as statusCodes } from 'node:http2'
import { vi } from 'vitest'

const { mockGetManifest } = vi.hoisted(() => ({
  mockGetManifest: vi.fn()
}))

vi.mock('../../../../src/infra/api/guidance-api.js', () => ({
  getPrototypeGuidesManifest: mockGetManifest
}))

import { createServer } from '../../../../src/server/server.js'

const manifest = {
  'claims-guide': {
    documentId: '9846c231-d74b-4ca5-b66a-f3e064fed0df',
    title: 'Claims Guide'
  },
  'land-use-guide': {
    documentId: '48b8a1df-c71b-4de3-ac73-7c672aaf5456',
    title: 'Land Use Guide'
  }
}

const notFound = { ok: false, status: statusCodes.HTTP_STATUS_NOT_FOUND, data: null }

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
    test('Should list every prototype guide as not run', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

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

    test('Should link to the start page', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

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
      expect(payload).toContain('<option value="9846c231-d74b-4ca5-b66a-f3e064fed0df">Claims Guide</option>')
      expect(payload).toContain('<option value="48b8a1df-c71b-4de3-ac73-7c672aaf5456">Land Use Guide</option>')
    })

    test('Should have a start button that does not submit anything yet', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

      const { payload } = await server.inject({
        method: 'GET',
        url: '/proof-of-concept/quality-checks/start'
      })

      expect(payload).toContain('<button type="button" class="govuk-button" data-module="govuk-button">\n  Start quality check\n</button>')
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
})
