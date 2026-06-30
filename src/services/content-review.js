import * as guidanceApi from '../infra/api/guidance-api.js'
import { statusCodes } from '../constants/status-codes.js'
import {
  ReviewResultsOutcome,
  StartReviewOutcome
} from '../models/content-review.js'

/**
 * @typedef {Object} ReviewRun
 * @property {string} documentId
 * @property {string} title
 * @property {string} status
 * @property {string|null} jobId
 * @property {string|null} updatedAt
 */

/**
 * @private
 *
 * Fetches the latest content review run status for a single document.
 * 404 maps to status:'not_run'; unexpected errors surface to catch-all.
 *
 * @param {object} doc
 * @returns {Promise<ReviewRun>}
 */
async function _fetchReviewRun (doc) {
  const base = {
    documentId: doc.id,
    title: doc.title || doc.filename || 'Untitled'
  }

  const res = await guidanceApi.getLatestReview(doc.id)

  if (!res.ok) {
    return { ...base, status: 'not_run', jobId: null, updatedAt: null }
  }

  return {
    ...base,
    status: res.data.status,
    jobId: res.data.jobId,
    updatedAt: res.data.updatedAt
  }
}

/**
 * Lists all guidance documents with their latest content review status.
 *
 * @returns {Promise<ReviewRun[]>}
 */
async function listReviewRuns () {
  const result = await guidanceApi.listDocuments()

  return Promise.all(result.data.items.map(_fetchReviewRun))
}

/**
 * Starts a content review for a guidance document.
 * Returns a StartReviewOutcome for expected 409/404 outcomes (form-level errors)
 * and throws for unexpected failures (surfaces to catch-all as 500).
 *
 * @param {string} documentId
 * @returns {Promise<StartReviewOutcome>}
 */
async function startReview (documentId) {
  const res = await guidanceApi.startReview(documentId)

  if (res.ok) {
    return StartReviewOutcome.success(res.data.jobId)
  }
  if (res.status === statusCodes.HTTP_STATUS_CONFLICT) {
    return StartReviewOutcome.conflict()
  }

  return StartReviewOutcome.notFound()
}

/**
 * Fetches the latest content review for a document, resolving a human-readable
 * title from the document list (the critique result itself carries no title).
 *
 * @param {string} documentId
 * @returns {Promise<ReviewResultsOutcome>}
 */
async function getReviewResults (documentId) {
  const res = await guidanceApi.getLatestReview(documentId)

  // notFound covers both "no review run" (404) and "run not finished yet"
  // (no result payload), so the results page only renders completed reviews.
  if (!res.ok || !res.data.result) {
    return ReviewResultsOutcome.notFound()
  }

  const documents = await guidanceApi.listDocuments()
  const doc = documents.data.items.find((d) => d.id === documentId)
  const documentTitle = doc?.title || doc?.filename || documentId

  return ReviewResultsOutcome.success({
    documentTitle,
    ...res.data.result
  })
}

export {
  listReviewRuns,
  startReview,
  getReviewResults
}
