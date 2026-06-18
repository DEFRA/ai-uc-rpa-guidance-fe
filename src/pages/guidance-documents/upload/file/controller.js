import Boom from '@hapi/boom'

import { statusCodes } from '../../../../constants/status-codes.js'
import { config } from '../../../../config/config.js'

const cdpUploaderBase = "http://localhost:7337"

/**
 * Reads uploadId from the query string, constructs the CDP upload URL,
 * and renders the file upload form. Returns 400 if uploadId is absent.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {import('@hapi/hapi').ResponseObject}
 */
async function getUploadGuidanceDocumentFile (request, h) {
  const { uploadId } = request.query

  if (!uploadId) {
    return Boom.badRequest('uploadId is required')
  }

  const uploadUrl = cdpUploaderBase
    ? `${cdpUploaderBase}/upload-and-scan/${uploadId}`
    : `/upload-and-scan/${uploadId}`

  return h.view('guidance-documents/upload/file/page.njk', {
    pageTitle: 'Upload your document',
    uploadUrl,
    breadcrumbs: [
      { text: 'Home', href: '/' },
      { text: 'Guidance documents', href: '/guidance-documents' },
      {
        text: 'Upload a guidance document',
        href: '/guidance-documents/upload'
      }
    ]
  }).code(statusCodes.HTTP_STATUS_OK)
}

export {
  getUploadGuidanceDocumentFile
}
