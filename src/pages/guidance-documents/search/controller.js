import { statusCodes } from '../../../constants/status-codes.js'
import { searchGuidance } from '../../../services/guidance-search.js'
import { searchViewModel } from './view-model.js'

/**
 * Search the guidance index.
 *
 * The search agent is engaged only when something was actually typed: an
 * empty box is a visit to the page, not a query, and running a corpus-wide
 * search for it would cost the operator half a minute for nothing.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getGuidanceDocumentSearch (request, h) {
  const { q = '' } = request.query

  const search = q ? await searchGuidance(q) : null

  return h.view('guidance-documents/search/page.njk', searchViewModel(q, search))
    .code(statusCodes.HTTP_STATUS_OK)
}

export {
  getGuidanceDocumentSearch
}
