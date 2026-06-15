import { statusCodes } from '../../../constants/status-codes.js'
import { listDocuments } from '../../../infra/api/guidance-documents.js'
import { startAnalysis } from '../../../infra/api/publishing-jobs.js'

async function fetchDocumentOptions (logger) {
  try {
    const result = await listDocuments()
    return result.items
      .filter((doc) => doc.status === 'complete')
      .map((doc) => ({
        value: doc.id,
        text: doc.title || doc.filename || doc.id
      }))
  } catch (error) {
    logger.error(error, 'Failed to fetch guidance documents')
    return []
  }
}

async function renderNewCheckPage (request, h, options = {}) {
  const {
    errorMessage = null,
    showSelectError = false
  } = options

  const documentOptions = await fetchDocumentOptions(request.logger)

  return h.view('publishing-checks/new/page.njk', {
    pageTitle: 'Start a publishing check',
    page: 'publishing-checks',
    selectItems: [
      { value: '', text: 'Select a document' },
      ...documentOptions
    ],
    hasDocuments: documentOptions.length > 0,
    errorMessage,
    showSelectError,
    breadcrumbs: [
      { text: 'Home', href: '/' },
      { text: 'Publishing checks', href: '/publishing-checks' }
    ]
  }).code(statusCodes.HTTP_STATUS_OK)
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getNewCheck (request, h) {
  return renderNewCheckPage(request, h)
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function postNewCheck (request, h) {
  const { documentId } = request.payload

  if (!documentId) {
    return renderNewCheckPage(request, h, {
      errorMessage: 'Select a document to analyse',
      showSelectError: true
    })
  }

  try {
    const job = await startAnalysis(documentId)
    return h.redirect(
      `/publishing-checks/confirmation?jobId=${job.jobId}`
    )
  } catch (error) {
    request.logger.error(error, 'Failed to start analysis')

    let errorMessage = 'Something went wrong. Please try again.'
    if (error.statusCode === 409) {
      errorMessage =
        'This document has not been fully processed yet. Try again later.'
    } else if (error.statusCode === 404) {
      errorMessage =
        'The selected document could not be found. Select another.'
    }

    return renderNewCheckPage(request, h, { errorMessage })
  }
}

export {
  getNewCheck,
  postNewCheck
}
