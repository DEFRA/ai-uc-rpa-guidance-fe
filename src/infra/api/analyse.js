import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { config } from '../../config/config.js'
import { mockAnalysisData } from './mock-analysis-data.js'
import { getLatestAnalysis } from './publishing-jobs.js'

const mockAnalysisEnabled = config.get('guidanceApi.mockAnalysis')
const mockDataFile = config.get('guidanceApi.mockDataFile')

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
 * Returns mock data when mockAnalysis is enabled, otherwise retrieves
 * the latest completed analysis job from the backend.
 *
 * @param {string} documentId
 * @returns {Promise<AnalyseResponse>}
 * @throws {Error} If the API call fails
 */
async function analyseDocument (documentId) {
  if (mockAnalysisEnabled) {
    if (mockDataFile) {
      const filePath = resolve('data', mockDataFile)
      return Promise.resolve(JSON.parse(readFileSync(filePath, 'utf8')))
    }
    return Promise.resolve(mockAnalysisData)
  }

  const job = await getLatestAnalysis(documentId)
  return job.result
}

export {
  analyseDocument
}
