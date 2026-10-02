import { constants as statusCodes } from 'node:http2'
import { vi } from 'vitest'

const { mockGetManifest, mockGetContent, mockGetAsset, mockPurge, mockInitiateUpload } = vi.hoisted(() => ({
  mockGetManifest: vi.fn(),
  mockGetContent: vi.fn(),
  mockGetAsset: vi.fn(),
  mockPurge: vi.fn(),
  mockInitiateUpload: vi.fn()
}))

vi.mock('../../../../src/infra/api/guidance-api.js', () => ({
  getPrototypeGuidesManifest: mockGetManifest,
  getPrototypeGuideContent: mockGetContent,
  getPrototypeGuideAsset: mockGetAsset,
  purgePrototypeGuides: mockPurge,
  initiatePrototypeGuidesUpload: mockInitiateUpload
}))

import { createServer } from '../../../../src/server/server.js'

const DOCUMENT_ID = '9846c231-d74b-4ca5-b66a-f3e064fed0df'
const VERSION_ID = 'ddd2d5a9-b7bb-4a98-b46a-20703a6302a9'
const ASSET_ID = '23c1f0053631241bdd1d25c7303c525d263415ade059170ca4eaf2a86afd9468.png'

const manifest = {
  'claims-guide': {
    documentId: DOCUMENT_ID,
    title: 'Claims Guide',
    latestVersion: 1,
    versions: [
      {
        version: 1,
        versionId: VERSION_ID,
        createdAt: '2026-10-01T14:28:05Z',
        updatedAt: '2026-10-01T14:28:05Z',
        sections: 4,
        images: 10,
        contentUrl: `${DOCUMENT_ID}/${VERSION_ID}/content.md`
      }
    ]
  }
}

const notFound = { ok: false, status: statusCodes.HTTP_STATUS_NOT_FOUND, data: null }

describe('#prototypeGuidesAdminController', () => {
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

  describe('GET /admin/prototype-guides', () => {
    test('Should list each guide in the manifest with a link to it', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/admin/prototype-guides'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain(`href="/admin/prototype-guides/${DOCUMENT_ID}"`)
      expect(payload).toContain('Claims Guide')
      expect(payload).toContain('claims-guide')
      expect(payload).toContain('1 Oct 2026, 15:28')
    })

    test('Should list a guide whose manifest has no dates', async () => {
      const { createdAt, updatedAt, ...undated } = manifest['claims-guide'].versions[0]
      mockGetManifest.mockResolvedValueOnce({
        ok: true,
        data: { 'claims-guide': { ...manifest['claims-guide'], versions: [undated] } }
      })

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/admin/prototype-guides'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Claims Guide')
    })

    test('Should say nothing is loaded when the API has no manifest', async () => {
      mockGetManifest.mockResolvedValueOnce(notFound)

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/admin/prototype-guides'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('No guides are loaded')
    })

    test('Should warn that uploading replaces the guides, and offer a purge', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

      const { payload } = await server.inject({
        method: 'GET',
        url: '/admin/prototype-guides'
      })

      expect(payload).toContain('action="/admin/prototype-guides/upload"')
      expect(payload).toContain('Uploading replaces all the guides currently loaded')
      expect(payload).toContain('href="/admin/prototype-guides/purge"')
      expect(payload).toContain('govuk-button--warning')
    })

    test('Should offer neither the warning nor a purge when nothing is loaded', async () => {
      mockGetManifest.mockResolvedValueOnce(notFound)

      const { payload } = await server.inject({
        method: 'GET',
        url: '/admin/prototype-guides'
      })

      expect(payload).toContain('action="/admin/prototype-guides/upload"')
      expect(payload).not.toContain('Uploading replaces all the guides')
      expect(payload).not.toContain('href="/admin/prototype-guides/purge"')
    })

    test('Should report how many files a purge deleted', async () => {
      mockGetManifest.mockResolvedValueOnce(notFound)

      const { payload } = await server.inject({
        method: 'GET',
        url: '/admin/prototype-guides?purged=12'
      })

      expect(payload).toContain('Prototype guides purged')
      expect(payload).toContain('12 files were deleted')
    })

    test('Should say an upload is being scanned and unpacked', async () => {
      mockGetManifest.mockResolvedValueOnce(notFound)

      const { payload } = await server.inject({
        method: 'GET',
        url: '/admin/prototype-guides?uploaded=true'
      })

      expect(payload).toContain('Your zip file has been uploaded')
    })
  })

  describe('Purge', () => {
    test('Should ask for confirmation, warning it cannot be undone', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/admin/prototype-guides/purge'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Are you sure you want to purge all prototype guides?')
      expect(payload).toContain('You cannot undo this')
      expect(payload).toContain('action="/admin/prototype-guides/purge"')
      expect(mockPurge).not.toHaveBeenCalled()
    })

    test('Should purge and return to the list with the count', async () => {
      mockPurge.mockResolvedValueOnce({ ok: true, data: { deleted: 12 } })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/admin/prototype-guides/purge'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe('/admin/prototype-guides?purged=12')
      expect(mockPurge).toHaveBeenCalledTimes(1)
    })
  })

  describe('Upload', () => {
    test('Should open an upload session that returns to the list', async () => {
      mockInitiateUpload.mockResolvedValueOnce({ ok: true, data: { uploadId: 'upload-123' } })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/admin/prototype-guides/upload'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe('/admin/prototype-guides/upload?uploadId=upload-123')
      expect(mockInitiateUpload).toHaveBeenCalledWith('/admin/prototype-guides?uploaded=true')
    })

    test('Should show a form posting the zip to CDP uploader', async () => {
      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/admin/prototype-guides/upload?uploadId=upload-123'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toMatch(/action="[^"]*\/upload-and-scan\/upload-123"/)
      expect(payload).toContain('Uploading replaces all the guides currently loaded')
    })

    test('Should reject the form without an upload id', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/admin/prototype-guides/upload'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
    })
  })

  describe('GET /admin/prototype-guides/{documentId}', () => {
    test('Should render the guide with its pictures served by this app', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })
      mockGetContent.mockResolvedValueOnce({
        ok: true,
        data: `# Claims Guide\n\n## 1 Introduction\n\n![](../assets/${ASSET_ID})\n`
      })

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: `/admin/prototype-guides/${DOCUMENT_ID}`
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(mockGetContent).toHaveBeenCalledWith(DOCUMENT_ID)
      expect(payload).toContain('1 Introduction')
      expect(payload).toContain(`src="/admin/prototype-guides/${DOCUMENT_ID}/assets/${ASSET_ID}"`)
      expect(payload).not.toContain('../assets/')
      // The title is the page's own heading, not repeated from the content.
      expect(payload.match(/>Claims Guide</g)).toHaveLength(2) // heading + breadcrumb
    })

    test('Should 404 for a guide not in the manifest', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/admin/prototype-guides/00000000-0000-4000-8000-000000000000'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
      expect(mockGetContent).not.toHaveBeenCalled()
    })

    test('Should 404 when the guide content is missing', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })
      mockGetContent.mockResolvedValueOnce(notFound)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: `/admin/prototype-guides/${DOCUMENT_ID}`
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })

    test('Should 404 for an id that is not a uuid', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/admin/prototype-guides/not-a-uuid'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
      expect(mockGetManifest).not.toHaveBeenCalled()
    })
  })

  describe('GET /admin/prototype-guides/{documentId}/assets/{assetId}', () => {
    test('Should proxy the picture with its content type', async () => {
      mockGetAsset.mockResolvedValueOnce({ ok: true, data: Buffer.from([0x89, 0x50]) })

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: `/admin/prototype-guides/${DOCUMENT_ID}/assets/${ASSET_ID}`
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(headers['content-type']).toBe('image/png')
      expect(mockGetAsset).toHaveBeenCalledWith(DOCUMENT_ID, ASSET_ID)
    })

    test('Should 404 when the API has no such picture', async () => {
      mockGetAsset.mockResolvedValueOnce(notFound)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: `/admin/prototype-guides/${DOCUMENT_ID}/assets/missing.png`
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })

    test('Should 404 for an asset name that could leave the folder', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: `/admin/prototype-guides/${DOCUMENT_ID}/assets/..%2Fsecret`
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
      expect(mockGetAsset).not.toHaveBeenCalled()
    })
  })
})
