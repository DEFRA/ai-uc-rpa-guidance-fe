const SECTION_NUMBER = /^#?(\d+(?:\.\d+)*)$/

/**
 * A `marked` extension that rewrites intra-document cross-references so they
 * point at the correct section page within the viewer.
 *
 * The backend does not yet expose explicit link targets (the manifest `links`
 * field is currently empty), so resolution is heuristic: a link whose href is
 * a bare section number — optionally anchor-prefixed, e.g. `1.2` or `#1.2` —
 * is treated as a reference to that section, provided the section exists in
 * the manifest. External and unrecognised links are left untouched.
 *
 * This resolver is intentionally isolated so it can be tightened once the
 * backend renders explicit anchors/targets.
 *
 * @param {{ documentId: string, sections: { number: string }[] }} options
 * @returns {{ walkTokens: (token: object) => void }}
 */
function rewriteIntraDocLinks (options) {
  const { documentId, sections = [] } = options
  const known = new Set(sections.map((section) => section.number))

  return {
    walkTokens (token) {
      if (token.type !== 'link') {
        return
      }

      const match = SECTION_NUMBER.exec(token.href ?? '')
      if (!match || !known.has(match[1])) {
        return
      }

      token.href =
        `/guidance-documents/${documentId}/sections/${encodeURIComponent(match[1])}`
    }
  }
}

export { rewriteIntraDocLinks }
