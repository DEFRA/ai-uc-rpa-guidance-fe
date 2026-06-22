import { statusCodes } from '../../../constants/status-codes.js'

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getConfirmation (request, h) {
  const { jobId } = request.query

  return h.view('publishing-checks/confirmation/page.njk', {
    pageTitle: 'Publishing check started',
    page: 'publishing-checks',
    jobId,
    breadcrumbs: [
      { text: 'Home', href: '/' },
      { text: 'Publishing checks', href: '/publishing-checks' }
    ]
  }).code(statusCodes.HTTP_STATUS_OK)
}

export {
  getConfirmation
}
