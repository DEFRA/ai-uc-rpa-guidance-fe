import Boom from '@hapi/boom'
import { statusCodes } from '../../../../../constants/status-codes.js'
import { getReviewResults } from '../../../../../services/content-review.js'
import { getFindingFeedback, submitFeedback } from '../../../../../services/feedback.js'
import { detailViewModel } from './view-model.js'

const VIEW_PATH = 'content-review/results/v2/detail/page.njk'
const NO_REVIEW_FOUND_MESSAGE = 'No content review found for this document'
const FINDING_NOT_FOUND_MESSAGE = 'Finding not found'

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getContentReviewFinding (request, h) {
  const { documentId, index } = request.params
  const numericIndex = Number(index)

  const outcome = await getReviewResults(documentId)

  if (!outcome.succeeded) {
    throw Boom.notFound(NO_REVIEW_FOUND_MESSAGE)
  }

  const feedback = await getFindingFeedback(outcome.jobId, numericIndex)
  const viewModel = detailViewModel(outcome.result, documentId, numericIndex, outcome.jobId, feedback)

  if (!viewModel) {
    throw Boom.notFound(FINDING_NOT_FOUND_MESSAGE)
  }

  return h.view(VIEW_PATH, viewModel)
    .code(statusCodes.HTTP_STATUS_OK)
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function postContentReviewFeedback (request, h) {
  const { documentId, index } = request.params
  const numericIndex = Number(index)
  const { verdict, comment } = request.payload

  const outcome = await getReviewResults(documentId)

  if (!outcome.succeeded) {
    throw Boom.notFound(NO_REVIEW_FOUND_MESSAGE)
  }

  const result = await submitFeedback({
    jobId: outcome.jobId,
    agent: 'critic',
    findingIndex: numericIndex,
    verdict,
    comment: comment || null
  })

  if (result.alreadySubmitted) {
    const feedback = await getFindingFeedback(outcome.jobId, numericIndex)
    const viewModel = detailViewModel(outcome.result, documentId, numericIndex, outcome.jobId, feedback, {
      alreadySubmittedNotice: true
    })

    if (!viewModel) {
      throw Boom.notFound(FINDING_NOT_FOUND_MESSAGE)
    }

    return h.view(VIEW_PATH, viewModel)
      .code(statusCodes.HTTP_STATUS_CONFLICT)
  }

  return h.redirect(`/content-review/${documentId}/results/v2/${numericIndex}`)
}

/**
 * failAction for the feedback payload validation - re-renders the finding
 * detail page with an error summary instead of a generic 400.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @param {Error} error
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function contentReviewFeedbackFailAction (request, h, error) {
  const { documentId, index } = request.params
  const numericIndex = Number(index)

  const outcome = await getReviewResults(documentId)

  if (!outcome.succeeded) {
    throw Boom.notFound(NO_REVIEW_FOUND_MESSAGE)
  }

  const feedback = await getFindingFeedback(outcome.jobId, numericIndex)
  const viewModel = detailViewModel(outcome.result, documentId, numericIndex, outcome.jobId, feedback, {
    errorMessage: 'Select how this finding should be treated'
  })

  if (!viewModel) {
    throw Boom.notFound(FINDING_NOT_FOUND_MESSAGE)
  }

  request.log(['error', 'feedback-validation'], error)

  return h.view(VIEW_PATH, viewModel)
    .code(statusCodes.HTTP_STATUS_BAD_REQUEST)
    .takeover()
}

export {
  getContentReviewFinding,
  postContentReviewFeedback,
  contentReviewFeedbackFailAction
}
