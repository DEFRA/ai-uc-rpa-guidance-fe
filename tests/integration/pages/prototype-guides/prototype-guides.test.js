import { constants as statusCodes } from 'node:http2'
import { vi } from 'vitest'

const { mockGetManifest, mockGetSections, mockGetAsset, mockPurge, mockInitiateUpload } = vi.hoisted(() => ({
  mockGetManifest: vi.fn(),
  mockGetSections: vi.fn(),
  mockGetAsset: vi.fn(),
  mockPurge: vi.fn(),
  mockInitiateUpload: vi.fn()
}))

vi.mock('../../../../src/infra/api/guidance-api.js', () => ({
  getPrototypeGuidesManifest: mockGetManifest,
  getPrototypeGuideSections: mockGetSections,
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

describe('#prototypeGuidesController', () => {
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

  describe('GET /prototype-guides', () => {
    test('Should list each guide in the manifest with a link to it', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/prototype-guides'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain(`href="/prototype-guides/${DOCUMENT_ID}"`)
      expect(payload).toContain('Claims Guide')
      expect(payload).toContain('claims-guide')
      expect(payload).toContain('1 Oct 2026, 15:28')
    })

    test('Should encode a document id so it cannot inject markup into the list', async () => {
      const hostileId = '"><img src=x onerror=alert(1)>'
      mockGetManifest.mockResolvedValueOnce({
        ok: true,
        data: { 'claims-guide': { ...manifest['claims-guide'], documentId: hostileId } }
      })

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/prototype-guides'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).not.toContain('<img src=x')
      expect(payload).toContain(`href="/prototype-guides/${encodeURIComponent(hostileId)}"`)
    })

    test('Should list a guide whose manifest has no dates', async () => {
      const { createdAt, updatedAt, ...undated } = manifest['claims-guide'].versions[0]
      mockGetManifest.mockResolvedValueOnce({
        ok: true,
        data: { 'claims-guide': { ...manifest['claims-guide'], versions: [undated] } }
      })

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/prototype-guides'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Claims Guide')
    })

    test('Should say nothing is loaded when the API has no manifest', async () => {
      mockGetManifest.mockResolvedValueOnce(notFound)

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/prototype-guides'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('No guides are loaded')
    })

    test('Should warn that uploading replaces the guides, and offer a purge', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

      const { payload } = await server.inject({
        method: 'GET',
        url: '/prototype-guides'
      })

      expect(payload).toContain('action="/prototype-guides/upload"')
      expect(payload).toContain('Uploading replaces all the guides currently loaded')
      expect(payload).toContain('href="/prototype-guides/purge"')
      expect(payload).toContain('govuk-button--warning')
    })

    test('Should offer neither the warning nor a purge when nothing is loaded', async () => {
      mockGetManifest.mockResolvedValueOnce(notFound)

      const { payload } = await server.inject({
        method: 'GET',
        url: '/prototype-guides'
      })

      expect(payload).toContain('action="/prototype-guides/upload"')
      expect(payload).not.toContain('Uploading replaces all the guides')
      expect(payload).not.toContain('href="/prototype-guides/purge"')
    })

    test('Should report how many files a purge deleted', async () => {
      mockGetManifest.mockResolvedValueOnce(notFound)

      const { payload } = await server.inject({
        method: 'GET',
        url: '/prototype-guides?purged=12'
      })

      expect(payload).toContain('Prototype guides purged')
      expect(payload).toContain('12 files were deleted')
    })

    test('Should say an upload is being scanned and unpacked', async () => {
      mockGetManifest.mockResolvedValueOnce(notFound)

      const { payload } = await server.inject({
        method: 'GET',
        url: '/prototype-guides?uploaded=true'
      })

      expect(payload).toContain('Your zip file has been uploaded')
    })
  })

  describe('Purge', () => {
    test('Should ask for confirmation, warning it cannot be undone', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/prototype-guides/purge'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Are you sure you want to purge all prototype guides?')
      expect(payload).toContain('You cannot undo this')
      expect(payload).toContain('action="/prototype-guides/purge"')
      expect(mockPurge).not.toHaveBeenCalled()
    })

    test('Should purge and return to the list with the count', async () => {
      mockPurge.mockResolvedValueOnce({ ok: true, data: { deleted: 12 } })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/prototype-guides/purge'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe('/prototype-guides?purged=12')
      expect(mockPurge).toHaveBeenCalledTimes(1)
    })
  })

  describe('Purge from another site', () => {
    test.each([
      ['Sec-Fetch-Site says cross-site', { 'sec-fetch-site': 'cross-site' }],
      ['Sec-Fetch-Site says same-site', { 'sec-fetch-site': 'same-site' }],
      ['Origin names another host', { origin: 'https://evil.example' }],
      ['Origin is unparseable', { origin: 'null' }]
    ])('Should refuse when %s', async (_case, headers) => {
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/prototype-guides/purge',
        headers
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FORBIDDEN)
      expect(mockPurge).not.toHaveBeenCalled()
    })

    test.each([
      ['Sec-Fetch-Site says same-origin', { 'sec-fetch-site': 'same-origin' }],
      ['Origin names this host', { origin: 'http://localhost:3000', host: 'localhost:3000' }]
    ])('Should purge when %s', async (_case, headers) => {
      mockPurge.mockResolvedValueOnce({ ok: true, data: { deleted: 3 } })

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/prototype-guides/purge',
        headers
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(mockPurge).toHaveBeenCalledTimes(1)
    })
  })

  describe('Upload', () => {
    test('Should open an upload session that returns to the list', async () => {
      mockInitiateUpload.mockResolvedValueOnce({ ok: true, data: { uploadId: 'upload-123' } })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/prototype-guides/upload'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe('/prototype-guides/upload?uploadId=upload-123')
      expect(mockInitiateUpload).toHaveBeenCalledWith('/prototype-guides?uploaded=true')
    })

    test('Should show a form posting the zip to CDP uploader', async () => {
      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/prototype-guides/upload?uploadId=upload-123'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toMatch(/action="[^"]*\/upload-and-scan\/upload-123"/)
      expect(payload).toContain('Uploading replaces all the guides currently loaded')
    })

    test('Should reject the form without an upload id', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/prototype-guides/upload'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
    })
  })

  describe('GET /prototype-guides/{documentId}', () => {
    const guideSections = {
      introduction: '# Claims Guide\n\nRead this first.\n',
      sections: [
        { number: '1', heading: 'Introduction', level: 1, markdown: `## 1 Introduction\n\n![](../assets/${ASSET_ID})\n` },
        { number: '1.1', heading: 'Scope', level: 2, markdown: '### 1.1 Scope\n\nWho it is for.\n' },
        { number: '2', heading: 'Checking', level: 1, markdown: '## 2 Checking\n\nHow to check.\n' },
        { number: 'annex-a', heading: 'Annex A', level: 1, markdown: '## Annex A\n\nThe annex.\n' }
      ]
    }

    const view = async (query = '') => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })
      mockGetSections.mockResolvedValueOnce({ ok: true, data: guideSections })

      return server.inject({ method: 'GET', url: `/prototype-guides/${DOCUMENT_ID}${query}` })
    }

    // The outline, apart from the guide, to tell its links from the guide's text.
    const outlineOf = (payload) => payload.slice(payload.indexOf('<nav class="app-toc'), payload.indexOf('</nav>', payload.indexOf('<nav class="app-toc')))

    test('Should render the whole guide by default, each section where its outline links', async () => {
      const { statusCode, payload } = await view()

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(mockGetSections).toHaveBeenCalledWith(DOCUMENT_ID)
      expect(payload).toContain('Read this first.')
      for (const id of ['section-1', 'section-1.1', 'section-2', 'section-annex-a']) {
        expect(payload).toContain(`id="${id}"`)
      }
      expect(payload).toContain('How to check.')
      expect(payload).toContain('The annex.')
    })

    test('Should serve the guide\'s pictures from this app', async () => {
      const { payload } = await view()

      expect(payload).toContain(`src="/prototype-guides/${DOCUMENT_ID}/assets/${ASSET_ID}"`)
      expect(payload).not.toContain('../assets/')
    })

    test('Should show the title once, as the page\'s own heading', async () => {
      const { payload } = await view()

      expect(payload.match(/>Claims Guide</g)).toHaveLength(2) // heading + breadcrumb
    })

    test.each([
      ['whole', ''],
      ['in steps', '?view=steps&step=2']
    ])('Should offer a search for keywords in the guide, read %s, taking the find shortcut', async (_name, query) => {
      const { payload } = await view(query)

      expect(payload).toContain('data-module="keyword-search"')
      expect(payload).toContain('placeholder="Search for keywords in this document"')
      expect(payload).toMatch(/<input[^>]*data-module="search-shortcut"[^>]*>/)
      expect(payload).toContain('data-keyword-search-status')
    })

    test.each([
      ['whole', '?keywords=land%20use'],
      ['in steps', '?view=steps&step=2&keywords=land%20use']
    ])('Should open the guide, read %s, with the search it was sent with in the box', async (_name, query) => {
      const { statusCode, payload } = await view(query)

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toMatch(/<input[^>]*name="keywords"[^>]*value="land use"/)
    })

    test('Should open a step at its last match, as going back through the matches does', async () => {
      const { statusCode, payload } = await view('?view=steps&step=2&keywords=land&match=last')

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toMatch(/<input[^>]*name="keywords"[^>]*value="land"/)
    })

    test('Should outline every section at every depth, linking within the page', async () => {
      const outline = outlineOf((await view()).payload)

      expect(outline).toContain('href="#section-1"')
      expect(outline).toContain('href="#section-1.1"')
      expect(outline).toContain('href="#section-2"')
      expect(outline).toContain('href="#section-annex-a"')
      expect(outline).toContain('app-toc--full')
      expect(outline).toContain('data-module="guide-outline"')
    })

    test('Should not show an unnumbered section\'s slug as its number', async () => {
      const outline = outlineOf((await view()).payload)

      expect(outline).not.toContain('>annex-a<')
      expect(outline).toContain('Annex A')
    })

    test('Should offer the stepper from the whole guide', async () => {
      const { payload } = await view()

      expect(payload).toMatch(/<a[^>]*href="\?view=steps"[^>]*>\s*Stepper/)
      expect(payload).toMatch(/<a[^>]*aria-current="true"[^>]*>\s*Traditional/)
    })

    test('Should show the first top-level section and its subsections as step 1', async () => {
      const { statusCode, payload } = await view('?view=steps')

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Step 1 of 3')
      expect(payload).toContain('Read this first.')
      expect(payload).toContain('id="section-1"')
      expect(payload).toContain('Who it is for.')
      expect(payload).not.toContain('How to check.')
      expect(payload).toMatch(/<a[^>]*href="\?view=steps&amp;step=2"[^>]*rel="next"/)
      expect(payload).toContain('2 Checking')
    })

    test('Should show a later step without the introduction, with the way back', async () => {
      const { payload } = await view('?view=steps&step=3')

      expect(payload).toContain('Step 3 of 3')
      expect(payload).toContain('The annex.')
      expect(payload).not.toContain('Read this first.')
      expect(payload).toMatch(/<a[^>]*href="\?view=steps&amp;step=2"[^>]*rel="prev"/)
      expect(payload).not.toContain('rel="next"')
    })

    test('Should mark the step\'s own sections current in the outline, and link the others to their step', async () => {
      const outline = outlineOf((await view('?view=steps&step=2')).payload)

      expect(outline).toMatch(/<a[^>]*app-toc__link--current[^>]*href="#section-2"/)
      expect(outline).toContain('href="?view=steps&amp;step=1#section-1.1"')
      expect(outline).toContain('href="?view=steps&amp;step=3#section-annex-a"')
      expect(outline).toContain('data-module="guide-step-outline"')
    })

    test('Should offer the whole guide from the stepper', async () => {
      const { payload } = await view('?view=steps&step=2')

      expect(payload).toMatch(/<a[^>]*href="\?view=whole"[^>]*>\s*Traditional/)
      expect(payload).toMatch(/<a[^>]*aria-current="true"[^>]*>\s*Stepper/)
    })

    test('Should put Next above Previous, above the step, so Next stays put from step to step', async () => {
      const { payload } = await view('?view=steps&step=2')

      const next = payload.indexOf('rel="next"')
      const previous = payload.indexOf('rel="prev"')
      const step = payload.indexOf('How to check.')

      expect(next).toBeGreaterThan(-1)
      expect(next).toBeLessThan(previous)
      expect(previous).toBeLessThan(step)
    })

    test('Should not show the manifest\'s details', async () => {
      const { payload } = await view()

      expect(payload).not.toContain('Manifest details')
      expect(payload).not.toContain(VERSION_ID)
    })

    test('Should 404 for a step the guide does not have', async () => {
      const { statusCode } = await view('?view=steps&step=4')

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })

    test('Should 404 for a guide not in the manifest', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/prototype-guides/00000000-0000-4000-8000-000000000000'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
      expect(mockGetSections).not.toHaveBeenCalled()
    })

    test('Should 404 when the guide content is missing', async () => {
      mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })
      mockGetSections.mockResolvedValueOnce(notFound)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: `/prototype-guides/${DOCUMENT_ID}`
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })

    test('Should 404 for an id that is not a uuid', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/prototype-guides/not-a-uuid'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
      expect(mockGetManifest).not.toHaveBeenCalled()
    })
  })

  describe('GET /prototype-guides/{documentId}/assets/{assetId}', () => {
    test('Should proxy the picture with its content type', async () => {
      mockGetAsset.mockResolvedValueOnce({ ok: true, data: Buffer.from([0x89, 0x50]) })

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: `/prototype-guides/${DOCUMENT_ID}/assets/${ASSET_ID}`
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(headers['content-type']).toBe('image/png')
      expect(mockGetAsset).toHaveBeenCalledWith(DOCUMENT_ID, ASSET_ID)
    })

    test('Should 404 when the API has no such picture', async () => {
      mockGetAsset.mockResolvedValueOnce(notFound)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: `/prototype-guides/${DOCUMENT_ID}/assets/missing.png`
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })

    test('Should 404 for an asset name that could leave the folder', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: `/prototype-guides/${DOCUMENT_ID}/assets/..%2Fsecret`
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
      expect(mockGetAsset).not.toHaveBeenCalled()
    })
  })
})

describe('#prototypeGuidesPage', () => {
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

  test('Should be called Prototype guidance, not an admin page', async () => {
    mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })

    const { payload } = await server.inject({ method: 'GET', url: '/prototype-guides' })

    expect(payload).toContain('<h1 class="govuk-heading-xl">Prototype guidance</h1>')
    expect(payload).toMatch(/<title>\s*Prototype guidance/)
    expect(payload).not.toContain('Prototype guidance admin')
  })

  test('Should call a guide page Prototype guidance in its title and breadcrumbs', async () => {
    mockGetManifest.mockResolvedValueOnce({ ok: true, data: manifest })
    mockGetSections.mockResolvedValueOnce({ ok: true, data: { introduction: '# Claims Guide\n\nBody.\n', sections: [] } })

    const { payload } = await server.inject({ method: 'GET', url: `/prototype-guides/${DOCUMENT_ID}` })

    expect(payload).toContain('href="/prototype-guides"')
    expect(payload).toContain('Claims Guide - Prototype guidance')
    expect(payload).not.toContain('Prototype guidance admin')
  })

  test.each([
    ['/admin/prototype-guides', '/prototype-guides'],
    ['/admin/prototype-guides?purged=12', '/prototype-guides?purged=12'],
    [`/admin/prototype-guides/${DOCUMENT_ID}`, `/prototype-guides/${DOCUMENT_ID}`],
    ['/admin/prototype-guides/purge', '/prototype-guides/purge'],
    [`/admin/prototype-guides/${DOCUMENT_ID}/assets/${ASSET_ID}`, `/prototype-guides/${DOCUMENT_ID}/assets/${ASSET_ID}`]
  ])('Should move %s permanently to %s', async (from, to) => {
    const { statusCode, headers } = await server.inject({ method: 'GET', url: from })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_MOVED_PERMANENTLY)
    expect(headers.location).toBe(to)
  })
})
