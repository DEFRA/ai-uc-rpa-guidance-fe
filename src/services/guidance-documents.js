import {
  getDocument,
  initiateUpload,
  listDocuments
} from '../infra/api/guidance-documents.js'
import { FetchDocumentOutcome } from '../models/fetch-document-outcome.js'
import { ListDocumentsOutcome } from '../models/list-documents-outcome.js'
import { StartUploadOutcome } from '../models/start-upload-outcome.js'

/**
 * @param {number} [page=1]
 * @param {number} [pageSize=10]
 * @returns {Promise<ListDocumentsOutcome>}
 */
async function listGuidanceDocuments (page = 1, pageSize = 10) {
  const data = await listDocuments(page, pageSize)
  return ListDocumentsOutcome.success(data, data)
}

/**
 * Returns only guidance documents with status 'complete'.
 * Used by the new-check page to populate the document select.
 *
 * @returns {Promise<object[]>}
 */
async function getCompleteDocuments () {
  const result = await listDocuments()
  return result.items.filter(doc => doc.status === 'complete')
}

/**
 * @param {string} redirect
 * @returns {Promise<StartUploadOutcome>}
 */
async function startUpload (redirect) {
  const data = await initiateUpload({ redirect })
  return StartUploadOutcome.success(data.uploadId, data)
}

/**
 * @param {string} documentId
 * @returns {Promise<FetchDocumentOutcome>}
 */
async function fetchDocument (documentId) {
  try {
    const data = await getDocument(documentId)
    return FetchDocumentOutcome.success(data, data)
  } catch (error) {
    if (error.statusCode === 404) return FetchDocumentOutcome.notFound()
    throw error
  }
}

export {
  listGuidanceDocuments,
  getCompleteDocuments,
  startUpload,
  fetchDocument
}
