/**
 * A marked extension that rewrites intra-document cross-references
 * to point at the correct section page.
 *
 * Cross-references are resolved to section numbers at ingestion time in the
 * backend, so a link arrives here as either a bare section number (`1.2`) or an
 * anchored one (`#1.2`). Both are turned into a section-page URL; anything the
 * backend could not resolve is left untouched.
 * @param {{
 *   documentId: string,
 *   sections: { number: string, heading: string }[]
 * }} options
 */
function rewriteIntraDocLinks (options) {
  const { documentId, sections = [] } = options
  const knownNumbers = new Set(sections.map((s) => s.number))

  return {
    walkTokens (token) {
      if (token.type !== 'link') return

      const href = token.href ?? ''
      const stripped = href.startsWith('#') ? href.slice(1) : href

      if (knownNumbers.has(stripped)) {
        token.href = `/guidance-documents/${documentId}/sections/${encodeURIComponent(stripped)}`
      }
    }
  }
}

export { rewriteIntraDocLinks }
