import { statusCodes } from '../../../constants/status-codes.js'

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getConfirmation (request, h) {
  const { jobId } = request.query

  return h.view('content-review/confirmation/page.njk', {
    pageTitle: 'Content review started',
    page: 'content-review',
    jobId,
    breadcrumbs: [
      { text: 'Home', href: '/' },
      { text: 'Content review', href: '/content-review' }
    ]
  }).code(statusCodes.HTTP_STATUS_OK)
}

export {
  getConfirmation
}
