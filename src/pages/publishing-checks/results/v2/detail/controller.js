import Boom from '@hapi/boom'
import { statusCodes } from '../../../../../constants/status-codes.js'
import { getCheckResults } from '../../../../../services/publishing-checks.js'
import { detailViewModel } from './view-model.js'

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getPublishingCheckFinding (request, h) {
  const { documentId, index } = request.params

  const outcome = await getCheckResults(documentId)

  if (!outcome.succeeded) {
    throw Boom.notFound('No analysis found for this document')
  }

  const viewModel = detailViewModel(outcome.result, documentId, Number(index))

  if (!viewModel) {
    throw Boom.notFound('Finding not found')
  }

  return h.view('publishing-checks/results/v2/detail/page.njk', viewModel)
    .code(statusCodes.HTTP_STATUS_OK)
}

export {
  getPublishingCheckFinding
}
