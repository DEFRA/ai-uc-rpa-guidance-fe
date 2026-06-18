import { publishingChecksBreadcrumbs } from '../../common/breadcrumbs.js'

/**
 * @param {{ documents?: object[], errorMessage?: string|null, showSelectError?: boolean }} [options]
 * @returns {object}
 */
function newCheckViewModel ({ documents = [], errorMessage = null, showSelectError = false } = {}) {
  const documentOptions = documents.map(doc => ({
    value: doc.id,
    text: doc.title || doc.filename || doc.id
  }))

  return {
    pageTitle: 'Start a publishing check',
    page: 'publishing-checks',
    selectItems: [{ value: '', text: 'Select a document' }, ...documentOptions],
    hasDocuments: documentOptions.length > 0,
    errorMessage,
    showSelectError,
    breadcrumbs: publishingChecksBreadcrumbs()
  }
}

export {
  newCheckViewModel
}
