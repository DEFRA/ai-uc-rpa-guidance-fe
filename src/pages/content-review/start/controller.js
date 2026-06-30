import { statusCodes } from '../../../constants/status-codes.js'
import { getCompleteDocuments } from '../../../services/guidance-documents.js'
import { startReview } from '../../../services/content-review.js'
import { startReviewViewModel } from './view-model.js'

const START_REVIEW_ERROR_MESSAGES = {
  conflict: 'This document has not been fully processed yet. Try again later.',
  not_found: 'The selected document could not be found. Select another.'
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getStartReview (_request, h) {
  const documents = await getCompleteDocuments()

  return h.view('content-review/start/page.njk', startReviewViewModel({ documents }))
    .code(statusCodes.HTTP_STATUS_OK)
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function postStartReview (request, h) {
  const { documentId } = request.payload

  const outcome = await startReview(documentId)

  if (!outcome.succeeded) {
    const documents = await getCompleteDocuments()

    return h.view('content-review/start/page.njk',
      startReviewViewModel({
        documents,
        errorMessage: START_REVIEW_ERROR_MESSAGES[outcome.reason]
      })
    ).code(statusCodes.HTTP_STATUS_OK)
  }

  return h.redirect(`/content-review/confirmation?jobId=${outcome.jobId}`)
}

export {
  getStartReview,
  postStartReview
}
