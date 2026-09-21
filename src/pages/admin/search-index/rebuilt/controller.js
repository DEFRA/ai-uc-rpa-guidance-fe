import { statusCodes } from '../../../../constants/status-codes.js'
import { listDocumentSummaries } from '../../../../services/document-summaries.js'
import { rebuiltViewModel } from './view-model.js'

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getSearchIndexRebuilt (request, h) {
  const { purged = 0, failed = 0, took = 0 } = request.query

  const summaries = await listDocumentSummaries()

  return h
    .view('admin/search-index/rebuilt/page.njk', rebuiltViewModel(summaries, { purged, failed, took }))
    .code(statusCodes.HTTP_STATUS_OK)
}

export {
  getSearchIndexRebuilt
}
