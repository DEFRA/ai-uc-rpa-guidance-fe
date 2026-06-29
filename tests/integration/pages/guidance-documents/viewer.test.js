import { constants as statusCodes } from 'node:http2'
import { vi } from 'vitest'
import * as guidanceDocumentsService from '../../../../src/services/guidance-documents.js'
import { createServer } from '../../../../src/server/server.js'

vi.mock('../../../../src/services/guidance-documents.js')

const MANIFEST = {
  documentId: 'doc-1',
  title: 'My Guidance',
  sections: [
    { number: '1', heading: 'Overview', level: 1, parent: null, children: ['1.1'] },
    { number: '1.1', heading: 'Details', level: 2, parent: '1', children: [] },
    { number: '2', heading: 'Next Steps', level: 1, parent: null, children: [] }
  ]
}

describe('#guidanceViewerController', () => {
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

  test('Should render a section page with ToC, content and pager', async () => {
    guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(MANIFEST)
    guidanceDocumentsService.getDocumentSection.mockResolvedValueOnce('## 1 Overview\n\nSome body text.')

    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: '/guidance-documents/doc-1/sections/1'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    // ToC contains all sections
    expect(payload).toContain('Overview')
    expect(payload).toContain('Details')
    expect(payload).toContain('Next Steps')
    // Rendered markdown content
    expect(payload).toContain('Some body text.')
    // Section heading normalised to govuk-heading-m (level-1 heading rendered at h2)
    expect(payload).toContain('<h3 class="govuk-heading-m">1 Overview</h3>')
    // Current section highlighted in the ToC
    expect(payload).toContain('aria-current="page"')
    // Next pager link to section 2
    expect(payload).toContain('/guidance-documents/doc-1/sections/2')
  })

  test('Should normalise a deep section heading to govuk-heading-m', async () => {
    guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(MANIFEST)
    // Section 1.1 is level 2, so the backend renders its heading at h3.
    guidanceDocumentsService.getDocumentSection.mockResolvedValueOnce('### 1.1 Details\n\nNested body.')

    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: '/guidance-documents/doc-1/sections/1.1'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    expect(payload).toContain('<h3 class="govuk-heading-m">1.1 Details</h3>')
  })

  test('Should render the document landing page with blurb and full contents', async () => {
    guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(MANIFEST)

    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: '/guidance-documents/doc-1/view'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
    // Title and blurb
    expect(payload).toContain('My Guidance')
    expect(payload).toContain('Contents')
    // Full contents lists every section
    expect(payload).toContain('Overview')
    expect(payload).toContain('Details')
    expect(payload).toContain('Next Steps')
    // Start link to the first section
    expect(payload).toContain('/guidance-documents/doc-1/sections/1')
  })

  test('Should 404 the landing page when the document has no sections', async () => {
    guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce({ ...MANIFEST, sections: [] })

    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/guidance-documents/doc-1/view'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
  })

  test('Should 404 when the manifest is missing', async () => {
    guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(null)
    guidanceDocumentsService.getDocumentSection.mockResolvedValueOnce('## 1 Overview')

    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/guidance-documents/doc-1/sections/1'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
  })

  test('Should 404 when the section markdown is missing', async () => {
    guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(MANIFEST)
    guidanceDocumentsService.getDocumentSection.mockResolvedValueOnce(null)

    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/guidance-documents/doc-1/sections/99'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
  })

  test('Should 404 for an invalid section number', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/guidance-documents/doc-1/sections/not-a-number'
    })

    expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
  })

  describe('#getGuidanceDocumentImage', () => {
    const VALID_DOC_ID = '12345678-1234-5678-1234-567812345678'

    test('Should proxy image bytes with correct content type', async () => {
      const imageBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47])
      guidanceDocumentsService.getDocumentImage.mockResolvedValueOnce(imageBytes)

      const { statusCode, rawPayload, headers } = await server.inject({
        method: 'GET',
        url: `/guidance-documents/${VALID_DOC_ID}/assets/img_1.png`
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(headers['content-type']).toContain('image/png')
      expect(rawPayload).toEqual(imageBytes)
    })

    test('Should return 404 when image is not found', async () => {
      guidanceDocumentsService.getDocumentImage.mockResolvedValueOnce(null)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: `/guidance-documents/${VALID_DOC_ID}/assets/img_1.png`
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })

    test('Should return 404 for a non-UUID document ID', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/guidance-documents/not-a-uuid/assets/img_1.png'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })

    test('Should return 404 for a filename starting with a dash', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: `/guidance-documents/${VALID_DOC_ID}/assets/-secret.png`
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })
  })
})
