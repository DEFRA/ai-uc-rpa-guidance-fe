import { statusCodes } from '../../../constants/status-codes.js'
import { listDocuments } from '../../../infra/api/guidance-documents.js'

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getGuidanceDocuments (request, h) {
  const page = Number(request.query.page) || 1
  const pageSize = 10

  let result = { items: [], total: 0, page: 1, pageSize }

  try {
    result = await listDocuments(page, pageSize)
  } catch (error) {
    request.logger.error(error, 'Failed to fetch guidance documents')
  }

  const totalPages = Math.ceil(result.total / result.pageSize)

  return h.view('guidance-documents/list/page.njk', {
    pageTitle: 'Guidance documents',
    documents: result.items,
    pagination: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages
    },
    breadcrumbs: [{ text: 'Home', href: '/' }]
  }).code(statusCodes.HTTP_STATUS_OK)
}

export {
  getGuidanceDocuments
}
