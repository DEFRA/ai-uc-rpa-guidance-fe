import { homeCrumb } from '../../common/breadcrumbs.js'

/**
 * @param {object[]} guides Prototype guide manifest entries.
 * @param {{ current?: object | null, errorMessage?: string }} [state] The
 *   rebuild queued or running, if any, and what went wrong, if anything.
 * @returns {object}
 */
function searchIndexViewModel (guides, { current = null, errorMessage } = {}) {
  return {
    pageTitle: 'Search index admin',
    guides: guides.map((guide) => guide.title || guide.name),
    currentRebuildHref: current
      ? `/admin/search-index/rebuilds/${encodeURIComponent(current.rebuildId)}`
      : null,
    errorMessage,
    breadcrumbs: [homeCrumb]
  }
}

export {
  searchIndexViewModel
}
