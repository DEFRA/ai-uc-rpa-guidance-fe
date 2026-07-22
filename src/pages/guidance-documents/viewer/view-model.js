import { createMarkdown } from '../../../infra/markdown/markdown.js'
import { govukRenderer } from '../../../infra/markdown/govuk-renderer.js'
import { rewriteIntraDocLinks } from '../../../infra/markdown/intra-doc-links.js'
import { rewriteImagePaths } from '../../../infra/markdown/rewrite-image-paths.js'
import { shiftHeadings } from '../../../infra/markdown/shift-headings.js'
import { guidanceDocumentsBreadcrumbs } from '../../common/breadcrumbs.js'

/**
 * Fold the manifest's flat adjacency list into a nested tree for the ToC,
 * preserving document order and flagging the current section and its
 * ancestors (so the relevant branch renders expanded/highlighted).
 *
 * @param {{ number: string, heading: string, parent: string|null, children: string[] }[]} sections
 * @param {string} documentId
 * @param {string} currentNumber
 * @returns {object[]} Root nodes, each with nested `children`.
 */
function buildTocTree (sections, documentId, currentNumber) {
  const byNumber = new Map(sections.map((section) => [section.number, section]))

  // Mark the current section and every ancestor as "open".
  const open = new Set()
  let cursor = byNumber.get(currentNumber)
  while (cursor) {
    open.add(cursor.number)
    cursor = cursor.parent ? byNumber.get(cursor.parent) : null
  }

  const toNode = (section) => ({
    number: section.number,
    heading: section.heading,
    href: `/guidance-documents/${documentId}/sections/${encodeURIComponent(section.number)}`,
    isCurrent: section.number === currentNumber,
    isOpen: open.has(section.number),
    children: section.children
      .map((childNumber) => byNumber.get(childNumber))
      .filter(Boolean)
      .map(toNode)
  })

  return sections
    .filter((section) => section.parent === null || section.parent === undefined)
    .map(toNode)
}

/**
 * Build the view model for a document's landing page: a short intro and the
 * full table of contents.
 *
 * @param {{ documentId: string, manifest: object }} params
 * @returns {object}
 */
function landingViewModel (params) {
  const { documentId, manifest } = params
  const sections = manifest.sections ?? []
  const topLevelCount = sections.filter(
    (section) => section.parent === null || section.parent === undefined
  ).length

  return {
    pageTitle: manifest.title,
    page: 'guidance-documents',
    documentTitle: manifest.title,
    sectionCount: sections.length,
    topLevelCount,
    startHref: sections.length
      ? `/guidance-documents/${documentId}/sections/${encodeURIComponent(sections[0].number)}`
      : null,
    toc: buildTocTree(sections, documentId, null),
    breadcrumbs: [...guidanceDocumentsBreadcrumbs(), { text: manifest.title }]
  }
}

/**
 * Build the view model for a single guidance section page.
 *
 * @param {{ documentId: string, manifest: object, markdown: string, sectionNumber: string }} params
 * @returns {object}
 */
function sectionViewModel (params) {
  const { documentId, manifest, markdown, sectionNumber } = params
  const sections = manifest.sections ?? []
  const index = sections.findIndex((section) => section.number === sectionNumber)
  const current = index >= 0 ? sections[index] : null

  // The backend renders a section's heading at `level + 1` (so it varies with
  // depth in the document). Normalise so every section's primary heading reads
  // at a consistent govuk-heading-m, shifting any deeper headings by the same
  // amount to preserve relative nesting.
  const SECTION_HEADING_DEPTH = 3 // 3 -> govuk-heading-m (see govuk-renderer)
  const headingShift = current
    ? (current.level + 1) - SECTION_HEADING_DEPTH
    : 0

  const contentHtml = createMarkdown()
    .use(govukRenderer())
    .use(shiftHeadings({ by: headingShift }))
    .use(rewriteIntraDocLinks({ documentId, sections }))
    .use(rewriteImagePaths({ documentId }))
    .render(markdown)

  const toLink = (section) =>
    section && {
      heading: section.heading,
      number: section.number,
      href: `/guidance-documents/${documentId}/sections/${encodeURIComponent(section.number)}`
    }

  const sectionTitle = current
    ? `${current.number} ${current.heading}`
    : manifest.title

  return {
    pageTitle: `${sectionTitle} - ${manifest.title}`,
    page: 'guidance-documents',
    documentTitle: manifest.title,
    sectionTitle,
    contentHtml,
    toc: buildTocTree(sections, documentId, sectionNumber),
    previous: toLink(sections[index - 1]),
    next: toLink(sections[index + 1]),
    breadcrumbs: [
      ...guidanceDocumentsBreadcrumbs(),
      { text: manifest.title, href: `/guidance-documents/${documentId}/view` }
    ]
  }
}

export { landingViewModel, sectionViewModel, buildTocTree }
