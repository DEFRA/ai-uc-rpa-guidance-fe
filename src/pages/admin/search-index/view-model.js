import { homeCrumb } from '../../common/breadcrumbs.js'

/**
 * @param {object[]} documents
 * @param {string} [errorMessage]
 * @returns {object}
 */
function searchIndexViewModel (documents, errorMessage) {
  return {
    pageTitle: 'Search index admin',
    documents: documents.map((doc) => ({
      value: doc.id,
      text: doc.title || doc.filename || 'Untitled',
      hint: { text: doc.status }
    })),
    errorMessage,
    breadcrumbs: [homeCrumb]
  }
}

export {
  searchIndexViewModel
}
