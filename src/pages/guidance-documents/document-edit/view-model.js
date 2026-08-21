import { guidanceDocumentsBreadcrumbs } from '../../common/breadcrumbs.js'

/**
 * Build the view model for the whole-document edit form.
 *
 * @param {object} params
 * @param {string} params.documentId
 * @param {string} params.title Document title, without its "# " marker.
 * @param {string} params.bodyMarkdown Everything below the title line.
 * @returns {object}
 */
function documentEditViewModel (params) {
  const { documentId, title, bodyMarkdown } = params

  const documentHref = `/guidance-documents/${documentId}/view`

  return {
    pageTitle: `Edit ${title}`,
    page: 'guidance-documents',
    documentId,
    title,
    bodyMarkdown,
    formAction: `/guidance-documents/${documentId}/edit`,
    cancelHref: documentHref,
    breadcrumbs: [
      ...guidanceDocumentsBreadcrumbs(),
      { text: title, href: documentHref }
    ]
  }
}

export { documentEditViewModel }
