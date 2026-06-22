import { statusCodes } from '../../../constants/status-codes.js'
import { startUpload } from '../../../services/guidance-documents.js'

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {import('@hapi/hapi').ResponseObject}
 */
async function getUploadGuidanceDocument (request, h) {
  return h.view('guidance-documents/upload/page.njk', {
    pageTitle: 'Upload a guidance document',
    breadcrumbs: [
      { text: 'Home', href: '/' },
      { text: 'Guidance documents', href: '/guidance-documents' }
    ]
  }).code(statusCodes.HTTP_STATUS_OK)
}

/**
 * Initiates a CDP Uploader session via the guidance API, then redirects to
 * the file upload page.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {import('@hapi/hapi').ResponseObject}
 */
async function postUploadGuidanceDocument (request, h) {
  const redirect = '/guidance-documents/upload/confirmation'
  const outcome = await startUpload(redirect)
  return h.redirect(`/guidance-documents/upload/file?uploadId=${outcome.uploadId}`)
}

export { getUploadGuidanceDocument, postUploadGuidanceDocument }
