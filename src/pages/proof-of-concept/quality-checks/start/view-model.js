import { qualityChecksBreadcrumbs } from '../../../common/breadcrumbs.js'

/**
 * @param {object[]} guides - the prototype guides, as listPrototypeGuides gives them
 * @returns {object}
 */
function startViewModel (guides) {
  const guideOptions = guides.map(guide => ({
    value: guide.documentId,
    text: guide.title || guide.name
  }))

  return {
    pageTitle: 'Start a quality check',
    page: 'quality-checks',
    selectItems: [{ value: '', text: 'Select a document' }, ...guideOptions],
    hasGuides: guideOptions.length > 0,
    breadcrumbs: qualityChecksBreadcrumbs()
  }
}

export {
  startViewModel
}
