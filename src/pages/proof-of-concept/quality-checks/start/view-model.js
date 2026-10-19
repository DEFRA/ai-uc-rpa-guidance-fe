import { qualityChecksBreadcrumbs } from '../../../common/breadcrumbs.js'

/**
 * @param {object[]} guides - the prototype guides, as listPrototypeGuides gives them
 * @param {{ errorMessage?: string|null, showSelectError?: boolean }} [options]
 * @returns {object}
 */
function startViewModel (guides, { errorMessage = null, showSelectError = false } = {}) {
  const guideOptions = guides.map(guide => ({
    value: guide.documentId,
    text: guide.title || guide.name
  }))

  return {
    pageTitle: 'Start a quality check',
    page: 'quality-checks',
    selectItems: [{ value: '', text: 'Select a document' }, ...guideOptions],
    hasGuides: guideOptions.length > 0,
    errorMessage,
    showSelectError,
    breadcrumbs: qualityChecksBreadcrumbs()
  }
}

export {
  startViewModel
}
