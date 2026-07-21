import { slugify } from './slugify.js'

const SECTION_NUMBER = /^#?(\d+(?:\.\d+)*)$/

/**
 * A `marked` extension that rewrites intra-document cross-references so they
 * point at the correct section page within the viewer.
 *
 * Resolution order for a link href:
 *  1. Bare or anchor-prefixed section number (`1.2` or `#1.2`) — rewrite to
 *     the section URL.
 *  2. Fragment that, after slugification, matches a section's primary heading —
 *     first by exact slug match, then by word-boundary prefix match (to handle
 *     Word-style bookmarks that truncate the heading, e.g. `#_Assign_case` →
 *     `assign-case` which prefix-matches `assign-case-review`).  Among prefix
 *     matches the most specific (longest heading slug) wins.
 *     The rewritten href uses `#<rendered-id>` where the rendered id is
 *     slugify("{number} {heading}") — the backend always prefixes the section
 *     number to the heading text.
 *     If the match is the current section, the rewrite is a bare `#<rendered-id>`
 *     for same-page scroll; otherwise it includes the section page URL.
 *  3. Everything else — left untouched (same-page sub-heading anchors, external
 *     URLs).  Sub-heading anchors work because govukRenderer emits `id`
 *     attributes on every heading.
 *
 * @param {{ documentId: string, sections: { number: string, heading: string }[], currentSectionNumber?: string }} options
 * @returns {{ walkTokens: (token: object) => void }}
 */
function rewriteIntraDocLinks (options) {
  const { documentId, sections = [], currentSectionNumber } = options
  const knownNumbers = new Set(sections.map((s) => s.number))

  // Map from heading slug -> full section object.
  const headingSlugToSection = new Map(
    sections.map((s) => [slugify(s.heading), s])
  )

  /**
   * Find the best-matching section for a normalised fragment slug.
   * Tries exact match first, then word-boundary prefix match (most specific wins).
   */
  function findSection (normalizedSlug) {
    const exact = headingSlugToSection.get(normalizedSlug)
    if (exact) return exact

    let best = null
    let bestLen = 0
    for (const [headingSlug, s] of headingSlugToSection) {
      if (
        headingSlug.startsWith(normalizedSlug) &&
        (headingSlug.length === normalizedSlug.length || headingSlug[normalizedSlug.length] === '-')
      ) {
        if (headingSlug.length > bestLen) {
          bestLen = headingSlug.length
          best = s
        }
      }
    }
    return best
  }

  return {
    walkTokens (token) {
      if (token.type !== 'link') {
        return
      }

      const href = token.href ?? ''

      // 1. Section-number pattern (existing behaviour).
      const numberMatch = SECTION_NUMBER.exec(href)
      if (numberMatch && knownNumbers.has(numberMatch[1])) {
        token.href = `/guidance-documents/${documentId}/sections/${encodeURIComponent(numberMatch[1])}`
        return
      }

      // 2. Fragment matching a section's primary heading.
      if (href.startsWith('#')) {
        const normalizedSlug = slugify(href.slice(1))
        const section = findSection(normalizedSlug)
        if (section) {
          // The backend renders headings as "{number} {heading}", so the id
          // assigned by govukRenderer is slugify("{number} {heading}").
          const renderedId = slugify(`${section.number} ${section.heading}`)
          if (section.number === currentSectionNumber) {
            token.href = `#${renderedId}`
          } else {
            token.href = `/guidance-documents/${documentId}/sections/${encodeURIComponent(section.number)}#${renderedId}`
          }
        }
        // Unrecognised fragment — leave for same-page sub-heading scroll.
      }
    }
  }
}

export { rewriteIntraDocLinks }
