import { statusCodes } from '../../../../constants/status-codes.js'
import { qualityChecksBreadcrumbs } from '../../../common/breadcrumbs.js'

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getConfirmation (request, h) {
  return h.view('proof-of-concept/quality-checks/confirmation/page.njk', {
    pageTitle: 'Quality check started',
    page: 'quality-checks',
    jobId: request.query.jobId,
    breadcrumbs: qualityChecksBreadcrumbs()
  }).code(statusCodes.HTTP_STATUS_OK)
}

export {
  getConfirmation
}
