import { statusCodes } from '../../../../constants/status-codes.js'
import { listQualityCheckRuns } from '../../../../services/quality-checks.js'
import { statusViewModel } from './view-model.js'

/**
 * @param {import('@hapi/hapi').Request} _request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getQualityChecksStatus (_request, h) {
  const runs = await listQualityCheckRuns()

  return h.view('proof-of-concept/quality-checks/status/page.njk', statusViewModel(runs))
    .code(statusCodes.HTTP_STATUS_OK)
}

export {
  getQualityChecksStatus
}
