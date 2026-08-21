import { constants as statusCodes } from 'node:http2'
import { vi } from 'vitest'
import * as guidanceDocumentsService from '../../../../src/services/guidance-documents.js'
import { createServer } from '../../../../src/server/server.js'

vi.mock('../../../../src/services/guidance-documents.js')

const MANIFEST = {
  documentId: 'doc-1',
  title: 'My Guidance',
  sections: [
    { number: '1', heading: 'Overview', level: 1, parent: null, children: [] }
  ]
}

const DOCUMENT_MARKDOWN = '# My Guidance\n\n## 1 Overview\n\nIntro text.\n'

describe('#guidanceDocumentEditController', () => {
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

  describe('GET the document edit page', () => {
    test('Should render the title and body in separate controls', async () => {
      guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(MANIFEST)
      guidanceDocumentsService.getDocumentContent.mockResolvedValueOnce(DOCUMENT_MARKDOWN)

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/guidance-documents/doc-1/edit'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('name="title"')
      expect(payload).toContain('value="My Guidance"')
      // The body keeps its section headings but not the document title line.
      expect(payload).toContain('## 1 Overview')
      expect(payload).not.toContain('# My Guidance\n')
    })

    test('Should mount the editor with the document toolbar', async () => {
      guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(MANIFEST)
      guidanceDocumentsService.getDocumentContent.mockResolvedValueOnce(DOCUMENT_MARKDOWN)

      const { payload } = await server.inject({
        method: 'GET',
        url: '/guidance-documents/doc-1/edit'
      })

      expect(payload).toContain('data-module="guidance-editor"')
      expect(payload).toContain('data-editor-toolbar="document"')
      expect(payload).toContain('data-document-id="doc-1"')
      expect(payload).toContain('app-document-editor')
      expect(payload).toContain('guidance-editor')
    })

    test('Should fall back to the manifest title when the file has no heading line', async () => {
      guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(MANIFEST)
      guidanceDocumentsService.getDocumentContent.mockResolvedValueOnce('Body only.\n')

      const { payload } = await server.inject({
        method: 'GET',
        url: '/guidance-documents/doc-1/edit'
      })

      expect(payload).toContain('value="My Guidance"')
    })

    test('Should say the document is not saved', async () => {
      guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(MANIFEST)
      guidanceDocumentsService.getDocumentContent.mockResolvedValueOnce(DOCUMENT_MARKDOWN)

      const { payload } = await server.inject({
        method: 'GET',
        url: '/guidance-documents/doc-1/edit'
      })

      expect(payload).toContain('not saved')
    })

    test('Should return 404 when the manifest is missing', async () => {
      guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(null)
      guidanceDocumentsService.getDocumentContent.mockResolvedValueOnce(DOCUMENT_MARKDOWN)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/guidance-documents/doc-1/edit'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })

    test('Should return 404 when the content is missing', async () => {
      guidanceDocumentsService.getDocumentManifest.mockResolvedValueOnce(MANIFEST)
      guidanceDocumentsService.getDocumentContent.mockResolvedValueOnce(null)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/guidance-documents/doc-1/edit'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
    })
  })

  describe('POST the document edit page', () => {
    test('Should redirect to the document without persisting anything', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/guidance-documents/doc-1/edit',
        payload: { title: 'My Guidance', markdown: '## 1 Overview\n\nEdited.\n' }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe('/guidance-documents/doc-1/view')
      expect(guidanceDocumentsService.updateDocumentSection).not.toHaveBeenCalled()
    })

    test('Should accept a document larger than the default payload limit', async () => {
      // A whole document easily exceeds hapi's 1 MiB default.
      const markdown = 'x'.repeat(2 * 1024 * 1024)

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/guidance-documents/doc-1/edit',
        payload: { title: 'My Guidance', markdown }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
    })
  })
})
