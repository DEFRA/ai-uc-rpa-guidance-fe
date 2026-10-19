import { statusCodes } from '../../../../constants/status-codes.js'
import { listPrototypeGuides } from '../../../../services/prototype-guides.js'
import { statusViewModel } from './view-model.js'

/**
 * @param {import('@hapi/hapi').Request} _request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getQualityChecksStatus (_request, h) {
  const guides = await listPrototypeGuides()

  return h.view('proof-of-concept/quality-checks/status/page.njk', statusViewModel(guides))
    .code(statusCodes.HTTP_STATUS_OK)
}

export {
  getQualityChecksStatus
}
