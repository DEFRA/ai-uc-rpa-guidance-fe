import { statusCodes } from '../../../constants/status-codes.js'
import {
  cancelIndexRebuild,
  getCurrentIndexRebuild,
  getIndexRebuild,
  startIndexRebuild
} from '../../../services/document-summaries.js'
import { listPrototypeGuides } from '../../../services/prototype-guides.js'
import { searchIndexViewModel } from './view-model.js'

// Partial keeps what is indexed, so it is what a request that names no mode
// gets.
const DEFAULT_MODE = 'partial'

const ALREADY_REBUILDING = 'The index is already being rebuilt. Wait for it to finish, then try again.'

/**
 * @param {string} rebuildId
 * @returns {string}
 */
function progressPath (rebuildId) {
  return `/admin/search-index/rebuilds/${encodeURIComponent(rebuildId)}`
}

/**
 * Start a rebuild, or follow the one already running.
 *
 * A rebuild refused because another is running is followed instead. If that
 * one has finished by the time it is looked for, the rebuild is started once
 * more.
 *
 * @param {'full' | 'partial'} mode
 * @returns {Promise<object | null>} The rebuild to follow, or null if one is
 *   in the way and cannot be found.
 */
async function startOrFollowRebuild (mode) {
  return (await startIndexRebuild(mode)) ??
    (await getCurrentIndexRebuild()) ??
    (await startIndexRebuild(mode))
}

/**
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @param {'full' | 'partial'} mode
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function followOrRefuse (h, mode) {
  const rebuild = await startOrFollowRebuild(mode)

  if (rebuild) {
    return h.redirect(progressPath(rebuild.rebuildId))
  }

  const guides = await listPrototypeGuides()

  return h
    .view('admin/search-index/page.njk', searchIndexViewModel(guides, { errorMessage: ALREADY_REBUILDING }))
    .code(statusCodes.HTTP_STATUS_CONFLICT)
}

/**
 * @param {import('@hapi/hapi').Request} _request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getSearchIndexAdmin (_request, h) {
  const [guides, current] = await Promise.all([
    listPrototypeGuides(),
    getCurrentIndexRebuild()
  ])

  return h.view('admin/search-index/page.njk', searchIndexViewModel(guides, { current }))
    .code(statusCodes.HTTP_STATUS_OK)
}

/**
 * Queue a rebuild of the index, full or partial, then follow it.
 *
 * The API runs the rebuild in the background and answers at once, so this
 * request is not held open: the browser is sent to the rebuild's progress
 * page, which follows it to the end. If a rebuild is already running, the
 * browser follows that one instead.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function postSearchIndexRebuild (request, h) {
  return followOrRefuse(h, request.payload?.mode ?? DEFAULT_MODE)
}

/**
 * Cancel a rebuild, then start another of the same mode and follow it.
 *
 * A rebuild that is unknown or no longer running needs no cancelling, so the
 * new rebuild starts anyway: with the mode of the one asked to be cancelled
 * if it can still be read, or partial, which keeps what is indexed.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function postCancelAndRebuild (request, h) {
  const { rebuildId } = request.params

  const cancelled = (await cancelIndexRebuild(rebuildId)) ??
    (await getIndexRebuild(rebuildId))

  return followOrRefuse(h, cancelled?.mode ?? DEFAULT_MODE)
}

export {
  DEFAULT_MODE,
  getSearchIndexAdmin,
  postSearchIndexRebuild,
  postCancelAndRebuild
}
