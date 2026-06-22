import { config } from '../../config/config.js'

const guidanceApiUrl = config.get('guidanceApi.url')

/**
 * Submits a guidance document for async QA analysis.
 *
 * @param {string} documentId
 * @returns {Promise<object>} The created job record
 * @throws {Error} If the API call fails
 */
async function startAnalysis (documentId) {
  const url = `${guidanceApiUrl}/publishing/analyse`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId })
  })

  if (!response.ok) {
    const error = new Error(
      `Failed to start analysis: ${response.status} ${response.statusText}`
    )
    error.statusCode = response.status
    throw error
  }

  return response.json()
}

/**
 * Retrieves a publishing analysis job by ID.
 *
 * @param {string} jobId
 * @returns {Promise<object>}
 * @throws {Error} If the API call fails
 */
async function getJob (jobId) {
  const url = `${guidanceApiUrl}/publishing/jobs/${jobId}`

  const response = await fetch(url)

  if (!response.ok) {
    const error = new Error(
      `Failed to get job: ${response.status} ${response.statusText}`
    )
    error.statusCode = response.status
    throw error
  }

  return response.json()
}

/**
 * Retrieves the latest analysis job for a guidance document.
 *
 * @param {string} documentId
 * @returns {Promise<object>}
 * @throws {Error} If the API call fails (including 404 when no job exists)
 */
async function getLatestAnalysis (documentId) {
  const url =
    `${guidanceApiUrl}/publishing/documents/${documentId}/analysis`

  const response = await fetch(url)

  if (!response.ok) {
    const error = new Error(
      `Failed to get latest analysis: ${response.status} ${response.statusText}`
    )
    error.statusCode = response.status
    throw error
  }

  return response.json()
}

export {
  getJob,
  getLatestAnalysis,
  startAnalysis
}
