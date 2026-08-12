import { guidanceDocumentsBreadcrumbs } from '../../common/breadcrumbs.js'

const HEADING_FIELD_ID = 'heading'
const MARKDOWN_FIELD_ID = 'markdown'

/**
 * Build the view model for the section edit form.
 *
 * The section number is presented as a caption rather than a field: it is a
 * positional identity, and the backend takes it from the URL regardless of what
 * is posted.
 *
 * @param {object} params
 * @param {string} params.documentId
 * @param {object} params.manifest
 * @param {string} params.sectionNumber
 * @param {string} params.heading Heading text, without its number.
 * @param {string} params.bodyMarkdown Section body, without its heading line.
 * @param {Record<string, string>} [params.fieldErrors] Message per invalid field.
 * @returns {object}
 */
function editViewModel (params) {
  const {
    documentId,
    manifest,
    sectionNumber,
    heading,
    bodyMarkdown,
    fieldErrors = {}
  } = params

  const sectionHref = `/guidance-documents/${documentId}/sections/${encodeURIComponent(sectionNumber)}`
  const errorFields = [HEADING_FIELD_ID, MARKDOWN_FIELD_ID].filter(
    (field) => fieldErrors[field]
  )

  return {
    pageTitle: `Edit ${sectionNumber} ${heading} - ${manifest.title}`,
    page: 'guidance-documents',
    documentId,
    documentTitle: manifest.title,
    sectionNumber,
    heading,
    bodyMarkdown,
    formAction: `${sectionHref}/edit`,
    cancelHref: sectionHref,
    errors: fieldErrors,
    errorList: errorFields.map((field) => ({
      text: fieldErrors[field],
      href: `#${field}`
    })),
    breadcrumbs: [
      ...guidanceDocumentsBreadcrumbs(),
      { text: manifest.title, href: `/guidance-documents/${documentId}/view` },
      { text: `${sectionNumber} ${heading}`, href: sectionHref }
    ]
  }
}

export { editViewModel }
