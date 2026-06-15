import { config } from '../../config/config.js'

const guidanceApiUrl = config.get('guidanceApi.url')

/**
 * Initiates a document upload session via the guidance backend API.
 *
 * @param {{ redirect: string }} payload - Payload including the post-upload redirect URL
 * @returns {Promise<{ uploadId: string }>}
 * @throws {Error} If the API call fails
 */
async function initiateUpload (payload) {
  const url = `${guidanceApiUrl}/guidance/documents`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const error = new Error(
      `Failed to initiate upload: ${response.status} ${response.statusText}`
    )
    error.statusCode = response.status
    throw error
  }

  return response.json()
}

/**
 * Lists guidance documents with pagination.
 *
 * @param {number} [page=1]
 * @param {number} [pageSize=10]
 * @returns {Promise<{
 *   items: object[],
 *   total: number,
 *   page: number,
 *   pageSize: number
 * }>}
 * @throws {Error} If the API call fails
 */
async function listDocuments (page = 1, pageSize = 10) {
  const url =
    `${guidanceApiUrl}/guidance/documents` +
    `?page=${page}&page_size=${pageSize}`

  const response = await fetch(url)

  if (!response.ok) {
    const error = new Error(
      `Failed to list documents: ${response.status} ${response.statusText}`
    )
    error.statusCode = response.status
    throw error
  }

  return response.json()
}

/**
 * Retrieves a single guidance document by ID.
 *
 * @param {string} documentId
 * @returns {Promise<object>}
 * @throws {Error} If the API call fails
 */
async function getDocument (documentId) {
  const url = `${guidanceApiUrl}/guidance/documents/${documentId}`

  const response = await fetch(url)

  if (!response.ok) {
    const error = new Error(
      `Failed to get document: ${response.status} ${response.statusText}`
    )
    error.statusCode = response.status
    throw error
  }

  return response.json()
}

export {
  initiateUpload,
  listDocuments,
  getDocument
}
