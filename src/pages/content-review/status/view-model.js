import { homeCrumb } from '../../common/breadcrumbs.js'

/**
 * @param {import('../../../services/content-review.js').ReviewRun[]} runs
 * @returns {object}
 */
function statusViewModel (runs) {
  return {
    pageTitle: 'Content review',
    page: 'content-review',
    runs,
    breadcrumbs: [homeCrumb]
  }
}

export {
  statusViewModel
}
