import { statusCodes } from '../../../constants/status-codes.js'
import { listGuidanceDocuments } from '../../../services/guidance-documents.js'
import { listViewModel } from './view-model.js'

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getGuidanceDocuments (request, h) {
  const page = Number(request.query.page) || 1

  const result = await listGuidanceDocuments(page, 10)

  return h.view('guidance-documents/list/page.njk', listViewModel(result))
    .code(statusCodes.HTTP_STATUS_OK)
}

export { getGuidanceDocuments }
