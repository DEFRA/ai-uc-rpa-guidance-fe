import Boom from '@hapi/boom'
import { statusCodes } from '../../../../constants/status-codes.js'
import { getCheckResults } from '../../../../services/publishing-checks.js'
import { resultsViewModel } from './view-model.js'

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getPublishingCheckResultsV2 (request, h) {
  const { documentId } = request.params

  const outcome = await getCheckResults(documentId)

  if (!outcome.succeeded) {
    throw Boom.notFound('No analysis found for this document')
  }

  return h.view('publishing-checks/results/v2/page.njk', resultsViewModel(outcome.result, documentId))
    .code(statusCodes.HTTP_STATUS_OK)
}

export {
  getPublishingCheckResultsV2
}
