import { constants as statusCodes } from 'node:http2'
import { vi } from 'vitest'
import * as guidanceDocumentsService from '../../../../src/services/guidance-documents.js'
import { UpdateSectionOutcome } from '../../../../src/models/guidance-documents.js'
import { createServer } from '../../../../src/server/server.js'

vi.mock('../../../../src/services/guidance-documents.js')

const MANIFEST = {
  documentId: 'doc-1',
  title: 'My Guidance',
  sections: [
    { number: '1', heading: 'Overview', level: 1, parent: null, children: [] },
    { number: '7.2', heading: 'Email — case note template', level: 2, parent: '7', children: [] }
  ]
}

const SECTION_MARKDOWN = '### 7.2 Email — case note template\n\nSVBI is wrong.\n'

describe('#guidanceSectionEditController', () => {
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

  describe('GET the edit page', () => {
    test('Should render the heading and body in editable controls', async () => {
      guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(MANIFEST)
      guidanceDocumentsService.getDocumentSection.mockResolvedValueOnce(SECTION_MARKDOWN)

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/guidance-documents/doc-1/sections/7.2/edit'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('name="heading"')
      expect(payload).toContain('name="markdown"')
      // The heading field holds the text only, without its number.
      expect(payload).toContain('value="Email — case note template"')
      // The textarea holds the body only, without the heading line.
      expect(payload).toContain('SVBI is wrong.')
      expect(payload).not.toContain('### 7.2 Email')
    })

    test('Should show the section number as locked, not as an input', async () => {
      guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(MANIFEST)
      guidanceDocumentsService.getDocumentSection.mockResolvedValueOnce(SECTION_MARKDOWN)

      const { payload } = await server.inject({
        method: 'GET',
        url: '/guidance-documents/doc-1/sections/7.2/edit'
      })

      expect(payload).toContain('7.2')
      expect(payload).not.toContain('name="sectionNumber"')
      expect(payload).not.toContain('name="number"')
    })

    test('Should offer a cancel link back to the section view', async () => {
      guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(MANIFEST)
      guidanceDocumentsService.getDocumentSection.mockResolvedValueOnce(SECTION_MARKDOWN)

      const { payload } = await server.inject({
        method: 'GET',
        url: '/guidance-documents/doc-1/sections/7.2/edit'
      })

      expect(payload).toContain('/guidance-documents/doc-1/sections/7.2')
    })

    test('Should load the editor bundle and mark up the textarea for it', async () => {
      guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(MANIFEST)
      guidanceDocumentsService.getDocumentSection.mockResolvedValueOnce(SECTION_MARKDOWN)

      const { payload } = await server.inject({
        method: 'GET',
        url: '/guidance-documents/doc-1/sections/7.2/edit'
      })

      expect(payload).toContain('data-module="guidance-editor"')
      expect(payload).toContain('data-document-id="doc-1"')
      expect(payload).toContain('guidance-editor')
      expect(payload).toContain('type="module"')
    })

    test('Should 404 when the section markdown is missing', async () => {
      guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(MANIFEST)
      guidanceDocumentsService.getDocumentSection.mockResolvedValueOnce(null)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/guidance-documents/doc-1/sections/7.2/edit'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })

    test('Should 404 when the document manifest is missing', async () => {
      guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(null)
      guidanceDocumentsService.getDocumentSection.mockResolvedValueOnce(SECTION_MARKDOWN)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/guidance-documents/doc-1/sections/7.2/edit'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })

    test('Should 404 for a section number the manifest does not contain', async () => {
      guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(MANIFEST)
      guidanceDocumentsService.getDocumentSection.mockResolvedValueOnce('## 9 Ghost\n')

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/guidance-documents/doc-1/sections/9/edit'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })

    test('Should 404 for a malformed section number', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/guidance-documents/doc-1/sections/not-a-number/edit'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })
  })

  describe('POST the edit page', () => {
    test('Should save the edit and redirect to the section view', async () => {
      guidanceDocumentsService.updateDocumentSection.mockResolvedValueOnce(
        UpdateSectionOutcome.success()
      )

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/guidance-documents/doc-1/sections/7.2/edit',
        payload: {
          heading: 'Email — case note template',
          markdown: 'SBI is correct.'
        }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe('/guidance-documents/doc-1/sections/7.2')
      expect(guidanceDocumentsService.updateDocumentSection).toHaveBeenCalledWith(
        'doc-1',
        '7.2',
        { heading: 'Email — case note template', markdown: 'SBI is correct.' }
      )
    })

    test('Should accept an empty body', async () => {
      guidanceDocumentsService.updateDocumentSection.mockResolvedValueOnce(
        UpdateSectionOutcome.success()
      )

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/guidance-documents/doc-1/sections/7.2/edit',
        payload: { heading: 'Email — case note template', markdown: '' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
    })

    test('Should re-render with an error summary when the heading is blank', async () => {
      guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(MANIFEST)

      const { statusCode, payload } = await server.inject({
        method: 'POST',
        url: '/guidance-documents/doc-1/sections/7.2/edit',
        payload: { heading: '', markdown: 'Some text.' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
      expect(payload).toContain('There is a problem')
      expect(guidanceDocumentsService.updateDocumentSection).not.toHaveBeenCalled()
    })

    test('Should preserve the submitted body when validation fails', async () => {
      guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(MANIFEST)

      const { payload } = await server.inject({
        method: 'POST',
        url: '/guidance-documents/doc-1/sections/7.2/edit',
        payload: { heading: '', markdown: 'Work in progress that must not be lost.' }
      })

      expect(payload).toContain('Work in progress that must not be lost.')
    })

    test('Should 404 when the backend reports the section is gone', async () => {
      guidanceDocumentsService.updateDocumentSection.mockResolvedValueOnce(
        UpdateSectionOutcome.notFound()
      )

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/guidance-documents/doc-1/sections/7.2/edit',
        payload: { heading: 'Gone', markdown: 'Text.' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })

    test('Should re-render when the backend rejects the content', async () => {
      guidanceDocumentsService.updateDocumentSection.mockResolvedValueOnce(
        UpdateSectionOutcome.invalid()
      )
      guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(MANIFEST)

      const { statusCode, payload } = await server.inject({
        method: 'POST',
        url: '/guidance-documents/doc-1/sections/7.2/edit',
        payload: { heading: 'Overview', markdown: 'Text.' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
      expect(payload).toContain('There is a problem')
    })
  })
})
