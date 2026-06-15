import { statusCodes } from '../../../constants/status-codes.js'
import { listDocuments } from '../../../infra/api/guidance-documents.js'
import { getLatestAnalysis } from '../../../infra/api/publishing-jobs.js'

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getPublishingChecksStatus (request, h) {
  let documents = []

  try {
    const result = await listDocuments()
    documents = result.items
  } catch (error) {
    request.logger.error(error, 'Failed to fetch guidance documents')
  }

  const runs = await Promise.all(
    documents.map(async (doc) => {
      const title = doc.title || doc.filename || 'Untitled'

      try {
        const job = await getLatestAnalysis(doc.id)
        return {
          documentId: doc.id,
          title,
          status: job.status,
          jobId: job.jobId,
          updatedAt: job.updatedAt
        }
      } catch (error) {
        if (error.statusCode === 404) {
          return {
            documentId: doc.id,
            title,
            status: 'not_run',
            jobId: null,
            updatedAt: null
          }
        }
        request.logger.error(
          error,
          `Failed to fetch analysis for document ${doc.id}`
        )
        return {
          documentId: doc.id,
          title,
          status: 'error',
          jobId: null,
          updatedAt: null
        }
      }
    })
  )

  return h.view('publishing-checks/status/page.njk', {
    pageTitle: 'Publishing checks',
    page: 'publishing-checks',
    runs,
    breadcrumbs: [{ text: 'Home', href: '/' }]
  }).code(statusCodes.HTTP_STATUS_OK)
}

export {
  getPublishingChecksStatus
}
