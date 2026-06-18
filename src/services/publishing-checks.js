import { listDocuments } from '../infra/api/guidance-documents.js'
import { getLatestAnalysis, startAnalysis } from '../infra/api/publishing-jobs.js'
import { CheckResultsOutcome } from '../models/check-results-outcome.js'
import { StartCheckOutcome } from '../models/start-check-outcome.js'

/**
 * @param {string} documentId
 * @returns {Promise<CheckResultsOutcome>}
 */
async function getCheckResults (documentId) {
  try {
    const job = await getLatestAnalysis(documentId)

    return CheckResultsOutcome.success(job.result, job)
  } catch (error) {
    if (error.statusCode === 404) return CheckResultsOutcome.notFound()

    throw error
  }
}

/**
 * @typedef {Object} CheckRun
 * @property {string} documentId
 * @property {string} title
 * @property {string} status
 * @property {string|null} jobId
 * @property {string|null} updatedAt
 */

/**
 * Lists all guidance documents and their latest publishing check status.
 * 404 from getLatestAnalysis is mapped to status:'not_run' (expected domain state).
 * Per-document unexpected failures degrade to status:'error'.
 * Top-level listDocuments failure surfaces to catch-all.
 *
 * @returns {Promise<CheckRun[]>}
 */
async function listCheckRuns () {
  const result = await listDocuments()

  return Promise.all(
    result.items.map(async (doc) => {
      const title = doc.title || doc.filename || 'Untitled'

      try {
        const job = await getLatestAnalysis(doc.id)
        return {
          documentId: doc.id,
          title,
          status: job.status,
          jobId: job.jobId,
          updatedAt: job.updatedAt
        }
      } catch (error) {
        if (error.statusCode === 404) {
          return { documentId: doc.id, title, status: 'not_run', jobId: null, updatedAt: null }
        }

        return { documentId: doc.id, title, status: 'error', jobId: null, updatedAt: null }
      }
    })
  )
}

/**
 * Starts a publishing check for a guidance document.
 * Returns a StartCheckOutcome for expected 409/404 outcomes (form-level errors)
 * and throws for unexpected failures (surfaces to catch-all as 500).
 *
 * @param {string} documentId
 * @returns {Promise<StartCheckOutcome>}
 */
async function startCheck (documentId) {
  try {
    const job = await startAnalysis(documentId)

    return StartCheckOutcome.success(job.jobId, job)
  } catch (error) {
    if (error.statusCode === 409) return StartCheckOutcome.conflict()
    if (error.statusCode === 404) return StartCheckOutcome.notFound()

    throw error
  }
}

export {
  CheckResultsOutcome,
  StartCheckOutcome,
  getCheckResults,
  listCheckRuns,
  startCheck
}
