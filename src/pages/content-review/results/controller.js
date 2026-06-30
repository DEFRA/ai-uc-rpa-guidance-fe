import Boom from '@hapi/boom'
import { statusCodes } from '../../../constants/status-codes.js'
import { getReviewResults } from '../../../services/content-review.js'
import { resultsViewModel } from './view-model.js'

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getContentReviewResults (request, h) {
  const { documentId } = request.params

  const outcome = await getReviewResults(documentId)

  if (!outcome.succeeded) {
    throw Boom.notFound('No content review found for this document')
  }

  return h.view('content-review/results/page.njk', resultsViewModel(outcome.result))
    .code(statusCodes.HTTP_STATUS_OK)
}

export {
  getContentReviewResults
}
