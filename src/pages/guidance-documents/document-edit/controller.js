import Boom from '@hapi/boom'

import { statusCodes } from '../../../constants/status-codes.js'
import { splitDocumentMarkdown } from '../../../infra/markdown/section-heading.js'
import {
  getDocumentContent,
  getDocumentManifest
} from '../../../services/guidance-documents.js'
import { documentEditViewModel } from './view-model.js'

const VIEW_PATH = 'guidance-documents/document-edit/page.njk'
const DOCUMENT_NOT_FOUND_MESSAGE = 'Guidance document not found'

/**
 * Show the whole-document edit form.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getGuidanceDocumentEdit (request, h) {
  const { documentId } = request.params

  const [manifest, markdown] = await Promise.all([
    getDocumentManifest(documentId),
    getDocumentContent(documentId)
  ])

  if (!manifest || markdown === null) {
    throw Boom.notFound(DOCUMENT_NOT_FOUND_MESSAGE)
  }

  const { title, body } = splitDocumentMarkdown(markdown)

  return h
    .view(
      VIEW_PATH,
      documentEditViewModel({
        documentId,
        // The stored file is the source of truth for the title; fall back to the
        // manifest only if it somehow has no heading line.
        title: title ?? manifest.title,
        bodyMarkdown: body
      })
    )
    .code(statusCodes.HTTP_STATUS_OK)
}

/**
 * Accept a submitted document and discard it.
 *
 * This is a proof of concept for the editing experience only: nothing is
 * persisted, so the submission is deliberately dropped and the reader is
 * returned to the unchanged document.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {import('@hapi/hapi').ResponseObject}
 */
function postGuidanceDocumentEdit (request, h) {
  const { documentId } = request.params

  return h.redirect(`/guidance-documents/${documentId}/view`)
}

export { getGuidanceDocumentEdit, postGuidanceDocumentEdit }
