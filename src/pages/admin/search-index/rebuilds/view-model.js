import { homeCrumb } from '../../../common/breadcrumbs.js'

// How often the page asks again, in seconds, when scripts do not run. A guide
// takes tens of seconds, so this is often enough to see each one start.
const REFRESH_SECONDS = 2

const FINISHED = new Set(['complete', 'failed'])

/**
 * @param {string} rebuildId
 * @returns {string}
 */
function rebuildPath (rebuildId) {
  return `/admin/search-index/rebuilds/${encodeURIComponent(rebuildId)}`
}

/**
 * Where a finished rebuild is confirmed, with what it did.
 *
 * @param {object} rebuild The rebuild as the API reports it.
 * @returns {string | null} The confirmation, or null while it has not
 *   finished, or if it was cancelled: nothing was finished to confirm.
 */
function doneUrlFor (rebuild) {
  if (!FINISHED.has(rebuild.status)) {
    return null
  }

  const failed = rebuild.failures?.length ?? 0
  const took = rebuild.durationSeconds ?? 0
  const skipped = rebuild.skipped ?? 0

  return '/admin/search-index/rebuilt' +
    `?purged=${rebuild.purged ?? 0}&failed=${failed}&took=${took}&skipped=${skipped}`
}

/**
 * How far a rebuild has got, as the page and its script both show it.
 *
 * @param {object} rebuild The rebuild as the API reports it.
 * @returns {{ status: string, completed: number, total: number, label: string, doneUrl: string | null }}
 */
function rebuildStatus (rebuild) {
  const { status, total = 0, completed = 0, skipped = 0, currentTitle } = rebuild

  // Several guides are indexed at once: the title is the one started last,
  // and the count is how many have finished. Guides already up to date count
  // as finished from the start, so the bar opens part way along; the note
  // says why.
  const progress = currentTitle
    ? `Indexing ${currentTitle} - ${completed} of ${total} documents`
    : `Starting to index ${total} documents`
  const label = skipped ? `${progress} (${skipped} already indexed)` : progress

  return { status, completed, total, label, doneUrl: doneUrlFor(rebuild) }
}

/**
 * @param {object} rebuild The rebuild as the API reports it.
 * @returns {object}
 */
function rebuildProgressViewModel (rebuild) {
  const { status, total, completed, label } = rebuildStatus(rebuild)
  const cancelled = status === 'cancelled'
  const path = rebuildPath(rebuild.rebuildId)

  return {
    pageTitle: cancelled ? 'The rebuild was cancelled' : 'Rebuilding the search index',
    cancelled,
    refreshSeconds: cancelled ? null : REFRESH_SECONDS,
    statusUrl: `${path}/status`,
    cancelAndRebuildAction: `${path}/cancel-and-rebuild`,
    label,
    total,
    completed,
    breadcrumbs: [homeCrumb, { text: 'Search index admin', href: '/admin/search-index' }]
  }
}

export {
  doneUrlFor,
  rebuildProgressViewModel,
  rebuildStatus
}
