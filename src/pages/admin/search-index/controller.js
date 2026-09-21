import { statusCodes } from '../../../constants/status-codes.js'
import { rebuildDocumentSummaries } from '../../../services/document-summaries.js'
import { listAllGuidanceDocuments } from '../../../services/guidance-documents.js'
import { searchIndexViewModel } from './view-model.js'

const NOTHING_SELECTED = 'Select at least one document to index'

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getSearchIndexAdmin (request, h) {
  const documents = await listAllGuidanceDocuments()

  return h.view('admin/search-index/page.njk', searchIndexViewModel(documents))
    .code(statusCodes.HTTP_STATUS_OK)
}

/**
 * Rebuild the index from the selected documents.
 *
 * The rebuild is synchronous — the index is purged, then a model pass per
 * document — so this request is held open until every summary has been built
 * or has failed. Only the counts survive the redirect; the summaries
 * themselves are read back from the service, so a refresh of the confirmation
 * shows what is stored rather than rebuilding it — which is also why the
 * time it took is carried across: the confirmation cannot measure a rebuild
 * it did not run.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function postSearchIndexRebuild (request, h) {
  const { documentIds } = request.payload
  const selected = [].concat(documentIds)

  const { purged, failures, durationSeconds } = await rebuildDocumentSummaries(selected)

  return h.redirect(
    '/admin/search-index/rebuilt' +
    `?purged=${purged}&failed=${failures.length}&took=${durationSeconds}`
  )
}

/**
 * Re-render the page with an error rather than rebuilding nothing.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function rebuildFailAction (request, h) {
  const documents = await listAllGuidanceDocuments()

  return h
    .view('admin/search-index/page.njk', searchIndexViewModel(documents, NOTHING_SELECTED))
    .code(statusCodes.HTTP_STATUS_BAD_REQUEST)
    .takeover()
}

export {
  getSearchIndexAdmin,
  postSearchIndexRebuild,
  rebuildFailAction
}
