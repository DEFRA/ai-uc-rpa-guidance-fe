import Boom from '@hapi/boom'
import { statusCodes } from '../../../../../constants/status-codes.js'
import { getReviewResults } from '../../../../../services/content-review.js'
import { detailViewModel } from './view-model.js'

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getContentReviewFinding (request, h) {
  const { documentId, index } = request.params

  const outcome = await getReviewResults(documentId)

  if (!outcome.succeeded) {
    throw Boom.notFound('No content review found for this document')
  }

  const viewModel = detailViewModel(outcome.result, documentId, Number(index))

  if (!viewModel) {
    throw Boom.notFound('Finding not found')
  }

  return h.view('content-review/results/v2/detail/page.njk', viewModel)
    .code(statusCodes.HTTP_STATUS_OK)
}

export {
  getContentReviewFinding
}
