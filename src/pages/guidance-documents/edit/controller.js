import Boom from '@hapi/boom'

import { statusCodes } from '../../../constants/status-codes.js'
import { splitSectionMarkdown } from '../../../infra/markdown/section-heading.js'
import {
  getDocumentManifest,
  getDocumentSection,
  updateDocumentSection
} from '../../../services/guidance-documents.js'
import { editViewModel } from './view-model.js'

const VIEW_PATH = 'guidance-documents/edit/page.njk'
const SECTION_NOT_FOUND_MESSAGE = 'Guidance section not found'
const HEADING_REQUIRED_MESSAGE = 'Enter a heading for this section'
const SAVE_REJECTED_MESSAGE =
  'This section could not be saved. Check the heading and content and try again.'

/**
 * Look up a section in the manifest, or reject the request.
 *
 * @param {object} manifest
 * @param {string} sectionNumber
 * @returns {object} The manifest node for the section.
 */
function findSection (manifest, sectionNumber) {
  const section = manifest?.sections?.find(
    (candidate) => candidate.number === sectionNumber
  )

  if (!section) {
    throw Boom.notFound(SECTION_NOT_FOUND_MESSAGE)
  }

  return section
}

/**
 * Re-render the form with the user's own submission still in it.
 *
 * Reloads the manifest for the page furniture but deliberately keeps the posted
 * heading and body, so a validation failure never costs the editor their work.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @param {Record<string, string>} fieldErrors
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function renderWithErrors (request, h, fieldErrors) {
  const { documentId, sectionNumber } = request.params
  const manifest = await getDocumentManifest(documentId)
  const section = findSection(manifest, sectionNumber)

  const viewModel = editViewModel({
    documentId,
    manifest,
    sectionNumber,
    heading: request.payload?.heading ?? section.heading,
    bodyMarkdown: request.payload?.markdown ?? '',
    fieldErrors
  })

  return h.view(VIEW_PATH, viewModel).code(statusCodes.HTTP_STATUS_BAD_REQUEST)
}

/**
 * Show the edit form for a single guidance section.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getGuidanceSectionEdit (request, h) {
  const { documentId, sectionNumber } = request.params

  const [manifest, markdown] = await Promise.all([
    getDocumentManifest(documentId),
    getDocumentSection(documentId, sectionNumber)
  ])

  if (!manifest || markdown === null) {
    throw Boom.notFound(SECTION_NOT_FOUND_MESSAGE)
  }

  const section = findSection(manifest, sectionNumber)
  const { heading, body } = splitSectionMarkdown(markdown, sectionNumber)

  return h
    .view(
      VIEW_PATH,
      editViewModel({
        documentId,
        manifest,
        sectionNumber,
        // The stored file is the source of truth for the heading; fall back to
        // the manifest only if it somehow has no heading line.
        heading: heading ?? section.heading,
        bodyMarkdown: body
      })
    )
    .code(statusCodes.HTTP_STATUS_OK)
}

/**
 * Save an edited section, then redirect to it.
 *
 * Redirecting rather than rendering means the section view itself is the
 * confirmation: what the editor sees next is the stored result.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function postGuidanceSectionEdit (request, h) {
  const { documentId, sectionNumber } = request.params
  const { heading, markdown } = request.payload

  const outcome = await updateDocumentSection(documentId, sectionNumber, {
    heading,
    markdown
  })

  if (outcome.succeeded) {
    return h.redirect(
      `/guidance-documents/${documentId}/sections/${encodeURIComponent(sectionNumber)}`
    )
  }

  if (outcome.reason === 'not_found') {
    throw Boom.notFound(SECTION_NOT_FOUND_MESSAGE)
  }

  return renderWithErrors(request, h, { heading: SAVE_REJECTED_MESSAGE })
}

/**
 * failAction for the edit payload - re-renders the form with an error summary
 * rather than returning a bare 400.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @param {Error} error
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function guidanceSectionEditFailAction (request, h, error) {
  request.log(['error', 'section-edit-validation'], error)

  const response = await renderWithErrors(request, h, {
    heading: HEADING_REQUIRED_MESSAGE
  })

  return response.takeover()
}

export {
  getGuidanceSectionEdit,
  postGuidanceSectionEdit,
  guidanceSectionEditFailAction
}
