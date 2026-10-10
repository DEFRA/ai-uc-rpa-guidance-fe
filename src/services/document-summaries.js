import * as guidanceApi from '../infra/api/guidance-api.js'

/**
 * Every document summary the service holds, most recently rebuilt first.
 *
 * @returns {Promise<object[]>}
 */
async function listDocumentSummaries () {
  const res = await guidanceApi.listSummaries()
  return res.data.items
}

/**
 * Queue a rebuild of the index from the prototype guides.
 *
 * The API runs it in the background and returns at once, so this is not a
 * long call: follow the rebuild with getIndexRebuild.
 *
 * @param {'full' | 'partial'} mode Full empties the index and indexes every
 *   guide; partial indexes only guides that are new or changed.
 * @returns {Promise<object | null>} The queued rebuild, or null if one is
 *   already queued or running.
 */
async function startIndexRebuild (mode) {
  const res = await guidanceApi.rebuildSummaries(mode)
  return res.ok ? res.data : null
}

/**
 * A rebuild as it stands: its status, how many guides it has finished, and
 * which guide it started last.
 *
 * @param {string} rebuildId
 * @returns {Promise<object | null>} The rebuild, or null if the API does not
 *   know it.
 */
async function getIndexRebuild (rebuildId) {
  const res = await guidanceApi.getSummaryRebuild(rebuildId)
  return res.ok ? res.data : null
}

/**
 * The rebuild queued or running now, if there is one.
 *
 * @returns {Promise<object | null>}
 */
async function getCurrentIndexRebuild () {
  const res = await guidanceApi.getCurrentSummaryRebuild()
  return res.ok ? res.data : null
}

/**
 * Cancel a rebuild. Returns once the cancellation is recorded.
 *
 * @param {string} rebuildId
 * @returns {Promise<object | null>} The cancelled rebuild, or null if the API
 *   does not know it or it is no longer running.
 */
async function cancelIndexRebuild (rebuildId) {
  const res = await guidanceApi.cancelSummaryRebuild(rebuildId)
  return res.ok ? res.data : null
}

export {
  listDocumentSummaries,
  startIndexRebuild,
  getIndexRebuild,
  getCurrentIndexRebuild,
  cancelIndexRebuild
}
