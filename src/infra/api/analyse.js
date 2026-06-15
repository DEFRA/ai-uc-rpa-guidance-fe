import { config } from '../../config/config.js'
import { mockAnalysisData } from './mock-analysis-data.js'

const guidanceApiUrl = config.get('guidanceApi.url')
const mockAnalysisEnabled = config.get('guidanceApi.mockAnalysis')

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
 * Returns mock data when mockAnalysis is enabled, otherwise calls the API.
 *
 * @param {string} documentId
 * @returns {Promise<AnalyseResponse>}
 * @throws {Error} If the API call fails
 */
async function analyseDocument (documentId) {
  if (mockAnalysisEnabled) {
    return Promise.resolve(mockAnalysisData)
  }

  const url = `${guidanceApiUrl}/guidance/documents/${documentId}/analyse`

  const response = await fetch(url)

  if (!response.ok) {
    const error = new Error(
      `Failed to fetch analysis: ${response.status} ${response.statusText}`
    )
    error.statusCode = response.status
    throw error
  }

  return response.json()
}

export {
  analyseDocument
}
