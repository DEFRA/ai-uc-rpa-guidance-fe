import { contentReviewBreadcrumbs } from '../../common/breadcrumbs.js'

/**
 * @param {{ documents?: object[], errorMessage?: string|null, showSelectError?: boolean }} [options]
 * @returns {object}
 */
function startReviewViewModel ({ documents = [], errorMessage = null, showSelectError = false } = {}) {
  const documentOptions = documents.map(doc => ({
    value: doc.id,
    text: doc.title || doc.filename || doc.id
  }))

  return {
    pageTitle: 'Start a content review',
    page: 'content-review',
    selectItems: [{ value: '', text: 'Select a document' }, ...documentOptions],
    hasDocuments: documentOptions.length > 0,
    errorMessage,
    showSelectError,
    breadcrumbs: contentReviewBreadcrumbs()
  }
}

export {
  startReviewViewModel
}
