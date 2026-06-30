import { statusCodes } from '../../../constants/status-codes.js'
import { listReviewRuns } from '../../../services/content-review.js'
import { statusViewModel } from './view-model.js'

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getContentReviewStatus (_request, h) {
  const runs = await listReviewRuns()

  return h.view('content-review/status/page.njk', statusViewModel(runs))
    .code(statusCodes.HTTP_STATUS_OK)
}

export {
  getContentReviewStatus
}
