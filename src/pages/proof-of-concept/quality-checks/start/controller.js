import { statusCodes } from '../../../../constants/status-codes.js'
import { listPrototypeGuides } from '../../../../services/prototype-guides.js'
import { startQualityCheck } from '../../../../services/quality-checks.js'
import { startViewModel } from './view-model.js'

const START_PATH = '/proof-of-concept/quality-checks'
const VIEW = 'proof-of-concept/quality-checks/start/page.njk'

const START_CHECK_ERROR_MESSAGES = {
  not_found: 'The selected document could not be found. Select another.'
}

/**
 * @param {import('@hapi/hapi').Request} _request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getStartQualityCheck (_request, h) {
  const guides = await listPrototypeGuides()

  return h.view(VIEW, startViewModel(guides))
    .code(statusCodes.HTTP_STATUS_OK)
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function postStartQualityCheck (request, h) {
  const outcome = await startQualityCheck(request.payload.documentId)

  if (!outcome.succeeded) {
    const guides = await listPrototypeGuides()

    return h.view(VIEW, startViewModel(guides, {
      errorMessage: START_CHECK_ERROR_MESSAGES[outcome.reason]
    })).code(statusCodes.HTTP_STATUS_OK)
  }

  return h.redirect(`${START_PATH}/confirmation?jobId=${encodeURIComponent(outcome.jobId)}`)
}

/**
 * The form posted no guide: show it again, asking for one.
 *
 * @param {import('@hapi/hapi').Request} _request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function noGuideSelected (_request, h) {
  const guides = await listPrototypeGuides()

  return h.view(VIEW, startViewModel(guides, {
    errorMessage: 'Select a document to check',
    showSelectError: true
  }))
    .code(statusCodes.HTTP_STATUS_BAD_REQUEST)
    .takeover()
}

export {
  getStartQualityCheck,
  noGuideSelected,
  postStartQualityCheck
}
