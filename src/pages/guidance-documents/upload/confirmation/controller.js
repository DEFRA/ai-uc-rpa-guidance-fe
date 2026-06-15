import { statusCodes } from '../../../../constants/status-codes.js'

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {import('@hapi/hapi').ResponseObject}
 */
async function getUploadConfirmation (request, h) {
  const { uploadId } = request.query

  return h.view('guidance-documents/upload/confirmation/page.njk', {
    pageTitle: 'Document uploaded',
    uploadId,
    breadcrumbs: [
      { text: 'Home', href: '/' },
      { text: 'Guidance documents', href: '/guidance-documents' }
    ]
  }).code(statusCodes.HTTP_STATUS_OK)
}

export {
  getUploadConfirmation
}
