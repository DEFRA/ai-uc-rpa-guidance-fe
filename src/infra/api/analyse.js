import { getLatestAnalysis } from './publishing-jobs.js'

/**
 * @typedef {Object} FindingResponse
 * @property {string} category
 * @property {string} section
 * @property {'critical'|'high'|'medium'|'low'|'info'} severity
 * @property {string} issue
 * @property {string} why_it_matters
 * @property {string} recommendation
 */

/**
 * @typedef {Object} UsageResponse
 * @property {number} input_tokens
 * @property {number} output_tokens
 */

/**
 * @typedef {Object} AnalyseResponse
 * @property {'ready'|'not_ready'} verdict
 * @property {string} summary
 * @property {string} document_title
 * @property {FindingResponse[]} findings
 * @property {string[]} good_points
 * @property {UsageResponse} usage
 */

/**
 * Fetches the QA analysis results for a guidance document.
 *
 * @param {string} documentId
 * @returns {Promise<AnalyseResponse>}
 * @throws {Error} If the API call fails
 */
async function analyseDocument (documentId) {
  const job = await getLatestAnalysis(documentId)
  return job.result
}

export {
  analyseDocument
}
