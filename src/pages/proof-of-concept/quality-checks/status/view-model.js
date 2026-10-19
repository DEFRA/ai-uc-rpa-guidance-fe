import { homeCrumb } from '../../../common/breadcrumbs.js'

/**
 * @param {object[]} guides - the prototype guides, as listPrototypeGuides gives them
 * @returns {object}
 */
function statusViewModel (guides) {
  return {
    pageTitle: 'Prototype quality checks',
    page: 'quality-checks',
    guides: guides.map(guide => ({
      title: guide.title || guide.name
    })),
    breadcrumbs: [homeCrumb]
  }
}

export {
  statusViewModel
}
