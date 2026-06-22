import * as guidanceApi from '../infra/api/guidance-api.js'
import {
  CheckResultsOutcome,
  StartCheckOutcome
} from '../models/publishing-checks.js'

/**
 * @param {string} documentId
 * @returns {Promise<CheckResultsOutcome>}
 */
async function getCheckResults (documentId) {
  const res = await guidanceApi.getLatestAnalysis(documentId)

  return res.ok
    ? CheckResultsOutcome.success(res.data.result)
    : CheckResultsOutcome.notFound()
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
 * @private
 *
 * Fetches the latest check run status for a single document.
 * 404 maps to status:'not_run'; unexpected errors surface to catch-all.
 *
 * @param {object} doc
 * @returns {Promise<CheckRun>}
 */
async function _fetchCheckRun (doc) {
  const base = {
    documentId: doc.id,
    title: doc.title || doc.filename || 'Untitled'
  }

  const res = await guidanceApi.getLatestAnalysis(doc.id)

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
 * Lists all guidance documents with their latest publishing check status.
 *
 * @returns {Promise<CheckRun[]>}
 */
async function listCheckRuns () {
  const result = await guidanceApi.listDocuments()

  return Promise.all(result.data.items.map(_fetchCheckRun))
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
  const res = await guidanceApi.startAnalysis(documentId)

  if (res.ok) return StartCheckOutcome.success(res.data.jobId)
  if (res.status === 409) return StartCheckOutcome.conflict()

  return StartCheckOutcome.notFound()
}

export {
  getCheckResults,
  listCheckRuns,
  startCheck
}
