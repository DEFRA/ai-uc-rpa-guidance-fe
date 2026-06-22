import * as guidanceApi from '../infra/api/guidance-api.js'
import { FetchDocumentOutcome } from '../models/guidance-documents.js'

/**
 * @param {number} [page=1]
 * @param {number} [pageSize=10]
 * @returns {Promise<object>} Paginated document list
 */
async function listGuidanceDocuments (page = 1, pageSize = 10) {
  const res = await guidanceApi.listDocuments(page, pageSize)
  return res.data
}

/**
 * Returns only guidance documents with status 'complete'.
 * Used by the new-check page to populate the document select.
 *
 * @returns {Promise<object[]>}
 */
async function getCompleteDocuments () {
  const res = await guidanceApi.listDocuments()
  return res.data.items.filter((doc) => doc.status === 'complete')
}

/**
 * @param {string} redirect
 * @returns {Promise<{ uploadId: string }>}
 */
async function startUpload (redirect) {
  const res = await guidanceApi.initiateUpload({ redirect })
  return res.data
}

/**
 * @param {string} documentId
 * @returns {Promise<FetchDocumentOutcome>}
 */
async function fetchDocument (documentId) {
  const res = await guidanceApi.getDocument(documentId)
  return res.ok
    ? FetchDocumentOutcome.success(res.data)
    : FetchDocumentOutcome.notFound()
}

export {
  listGuidanceDocuments,
  getCompleteDocuments,
  startUpload,
  fetchDocument
}
