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

/**
 * Fetch the section graph manifest for a parsed document.
 *
 * @param {string} documentId
 * @returns {Promise<object|null>} The manifest, or null if not found.
 */
async function getDocumentManifest (documentId) {
  const res = await guidanceApi.getDocumentManifest(documentId)
  return res.ok ? res.data : null
}

/**
 * Fetch the rendered Markdown for a single document section.
 *
 * @param {string} documentId
 * @param {string} sectionNumber
 * @returns {Promise<string|null>} The section Markdown, or null if not found.
 */
async function getDocumentSection (documentId, sectionNumber) {
  const res = await guidanceApi.getDocumentSection(documentId, sectionNumber)
  return res.ok ? res.data : null
}

/**
 * Fetch the raw bytes for an image extracted from a guidance document.
 *
 * @param {string} documentId
 * @param {string} filename
 * @returns {Promise<Buffer|null>} Image bytes, or null if not found.
 */
async function getDocumentImage (documentId, filename) {
  const res = await guidanceApi.getDocumentImage(documentId, filename)
  return res.ok ? res.data : null
}

export {
  listGuidanceDocuments,
  getCompleteDocuments,
  startUpload,
  fetchDocument,
  getDocumentManifest,
  getDocumentSection,
  getDocumentImage
}
