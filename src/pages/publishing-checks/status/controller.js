import { statusCodes } from '../../../constants/status-codes.js'
import { listCheckRuns } from '../../../services/publishing-checks.js'
import { statusViewModel } from './view-model.js'

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getPublishingChecksStatus (_request, h) {
  const runs = await listCheckRuns()

  return h.view('publishing-checks/status/page.njk', statusViewModel(runs))
    .code(statusCodes.HTTP_STATUS_OK)
}

export {
  getPublishingChecksStatus
}
