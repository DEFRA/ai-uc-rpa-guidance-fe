import { getFindingFeedback, submitFeedback } from './feedback.js'
import { FindingDetailOutcome } from '../models/finding-detail.js'

/**
 * Loads a single finding's underlying data - the review/check result plus any
 * existing feedback for it. Callers are responsible for validating the
 * finding index against the result and building a view model from it.
 *
 * @param {object} params
 * @param {(documentId: string) => Promise<{ succeeded: boolean, jobId: string, result: object }>} params.getResults
 *   Fetches the review/check outcome for a document (e.g. getReviewResults, getCheckResults).
 * @param {string} params.documentId
 * @param {number} params.index
 * @returns {Promise<FindingDetailOutcome>}
 */
async function getFindingDetail ({ getResults, documentId, index }) {
  const outcome = await getResults(documentId)

  if (!outcome.succeeded) {
    return FindingDetailOutcome.notFound()
  }

  const feedback = await getFindingFeedback(outcome.jobId, index)

  return FindingDetailOutcome.loaded(outcome.jobId, outcome.result, feedback)
}

/**
 * Submits feedback for a finding. If feedback was already submitted for it,
 * returns the current result/feedback so the caller can re-render with a
 * notice rather than failing outright.
 *
 * @param {object} params
 * @param {(documentId: string) => Promise<{ succeeded: boolean, jobId: string, result: object }>} params.getResults
 * @param {string} params.documentId
 * @param {string} params.agent
 * @param {number} params.index
 * @param {string} params.verdict
 * @param {string} [params.comment]
 * @returns {Promise<FindingDetailOutcome>}
 */
async function submitFindingFeedback ({ getResults, documentId, agent, index, verdict, comment }) {
  const outcome = await getResults(documentId)

  if (!outcome.succeeded) {
    return FindingDetailOutcome.notFound()
  }

  const submission = await submitFeedback({
    jobId: outcome.jobId,
    agent,
    findingIndex: index,
    verdict,
    comment: comment || null
  })

  if (submission.alreadySubmitted) {
    const feedback = await getFindingFeedback(outcome.jobId, index)
    return FindingDetailOutcome.alreadySubmitted(outcome.jobId, outcome.result, feedback)
  }

  return FindingDetailOutcome.submitted()
}

export {
  getFindingDetail,
  submitFindingFeedback
}
