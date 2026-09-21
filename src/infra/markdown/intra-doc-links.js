// A link destination, with the angle brackets a converted document wraps one in
// treated as punctuation rather than part of the target. Titles are out of scope:
// the parser does not write them, and a destination followed by one is left alone.
const LINK_DESTINATION = /\]\(<?([^()<>\s]+)>?\)/g

/**
 * Point a section's cross-references at the pages that hold them.
 *
 * Cross-references are resolved to section numbers at ingestion time in the
 * backend, so a link arrives here as either a bare section number (`1.2`) or an
 * anchored one (`#1.2`). Both become a section-page URL; anything the backend
 * could not resolve is left untouched, which is also what keeps an ordinary
 * external link external.
 *
 * The rewrite is on the Markdown rather than on a renderer's tokens because both
 * things that render a section -- the editor's schema and the server's Markdown
 * pipeline -- have to agree about where a link points, and only the text is
 * common to the two.
 *
 * @param {string} markdown
 * @param {{
 *   documentId: string,
 *   sections: { number: string }[]
 * }} options
 * @returns {string}
 */
function linkSectionReferences (markdown, options) {
  const { documentId, sections = [] } = options
  const knownNumbers = new Set(sections.map((section) => section.number))

  return markdown.replaceAll(LINK_DESTINATION, (match, destination) => {
    const number = destination.startsWith('#') ? destination.slice(1) : destination

    if (!knownNumbers.has(number)) {
      return match
    }

    return `](/guidance-documents/${documentId}/sections/${encodeURIComponent(number)})`
  })
}

export { linkSectionReferences }
