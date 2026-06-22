import { homeCrumb } from '../../common/breadcrumbs.js'

/**
 * @param {import('../../../services/publishing-checks.js').CheckRun[]} runs
 * @returns {object}
 */
function statusViewModel (runs) {
  return {
    pageTitle: 'Publishing checks',
    page: 'publishing-checks',
    runs,
    breadcrumbs: [homeCrumb]
  }
}

export {
  statusViewModel
}
