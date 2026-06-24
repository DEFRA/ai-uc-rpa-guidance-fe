import Boom from '@hapi/boom'

import { statusCodes } from '../../../constants/status-codes.js'
import {
  getDocumentManifest,
  getDocumentSection
} from '../../../services/guidance-documents.js'
import { landingViewModel, sectionViewModel } from './view-model.js'

/**
 * Landing page for a document: a short intro and the full table of contents.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getGuidanceViewerIndex (request, h) {
  const { documentId } = request.params

  const manifest = await getDocumentManifest(documentId)

  if (!manifest || !manifest.sections?.length) {
    throw Boom.notFound('Guidance document not found')
  }

  return h
    .view(
      'guidance-documents/viewer/index.njk',
      landingViewModel({ documentId, manifest })
    )
    .code(statusCodes.HTTP_STATUS_OK)
}

/**
 * Render a single section of a guidance document.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getGuidanceViewerSection (request, h) {
  const { documentId, sectionNumber } = request.params

  const [manifest, markdown] = await Promise.all([
    getDocumentManifest(documentId),
    getDocumentSection(documentId, sectionNumber)
  ])

  if (!manifest || markdown === null) {
    throw Boom.notFound('Guidance section not found')
  }

  return h
    .view(
      'guidance-documents/viewer/page.njk',
      sectionViewModel({ documentId, manifest, markdown, sectionNumber })
    )
    .code(statusCodes.HTTP_STATUS_OK)
}

export { getGuidanceViewerIndex, getGuidanceViewerSection }
