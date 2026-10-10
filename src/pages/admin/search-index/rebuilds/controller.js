import Boom from '@hapi/boom'

import { statusCodes } from '../../../../constants/status-codes.js'
import { getIndexRebuild } from '../../../../services/document-summaries.js'
import { doneUrlFor, rebuildProgressViewModel, rebuildStatus } from './view-model.js'

/**
 * @param {string} rebuildId
 * @returns {Promise<object>}
 */
async function findRebuild (rebuildId) {
  const rebuild = await getIndexRebuild(rebuildId)

  if (!rebuild) {
    throw Boom.notFound('Rebuild not found')
  }

  return rebuild
}

/**
 * Follow a rebuild: show how far it has got, or, once it has finished, go to
 * the confirmation with what it did.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getSearchIndexRebuildProgress (request, h) {
  const rebuild = await findRebuild(request.params.rebuildId)
  const doneUrl = doneUrlFor(rebuild)

  if (doneUrl) {
    return h.redirect(doneUrl)
  }

  // Cancelled is shown here rather than at the confirmation: nothing was
  // finished to confirm.
  return h.view('admin/search-index/rebuilds/page.njk', rebuildProgressViewModel(rebuild))
    .code(statusCodes.HTTP_STATUS_OK)
}

/**
 * How far a rebuild has got, for the progress page's script to show without
 * reloading the page.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getSearchIndexRebuildStatus (request, h) {
  const rebuild = await findRebuild(request.params.rebuildId)

  return h.response(rebuildStatus(rebuild)).code(statusCodes.HTTP_STATUS_OK)
}

export {
  getSearchIndexRebuildProgress,
  getSearchIndexRebuildStatus
}
