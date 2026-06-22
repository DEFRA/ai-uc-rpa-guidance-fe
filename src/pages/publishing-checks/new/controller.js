import { statusCodes } from '../../../constants/status-codes.js'
import { getCompleteDocuments } from '../../../services/guidance-documents.js'
import { startCheck } from '../../../services/publishing-checks.js'
import { newCheckViewModel } from './view-model.js'

const START_CHECK_ERROR_MESSAGES = {
  conflict: 'This document has not been fully processed yet. Try again later.',
  not_found: 'The selected document could not be found. Select another.'
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getNewCheck (_request, h) {
  const documents = await getCompleteDocuments()

  return h.view('publishing-checks/new/page.njk', newCheckViewModel({ documents }))
    .code(statusCodes.HTTP_STATUS_OK)
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function postNewCheck (request, h) {
  const { documentId } = request.payload

  const outcome = await startCheck(documentId)

  if (!outcome.succeeded) {
    const documents = await getCompleteDocuments()

    return h.view('publishing-checks/new/page.njk',
      newCheckViewModel({
        documents,
        errorMessage: START_CHECK_ERROR_MESSAGES[outcome.reason]
      })
    ).code(statusCodes.HTTP_STATUS_OK)
  }

  return h.redirect(`/publishing-checks/confirmation?jobId=${outcome.jobId}`)
}

export {
  getNewCheck,
  postNewCheck
}
