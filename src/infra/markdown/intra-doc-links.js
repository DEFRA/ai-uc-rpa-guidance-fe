import { slugify } from './slugify.js'

/**
 * A marked extension that rewrites intra-document cross-references
 * to point at the correct section page.
 * @param {{
 *   documentId: string,
 *   sections: { number: string, heading: string }[],
 *   currentSectionNumber?: string
 * }} options
 */
function rewriteIntraDocLinks (options) {
  const { documentId, sections = [], currentSectionNumber } = options
  const knownNumbers = new Set(sections.map((s) => s.number))

  const headingSlugToSection = new Map(
    sections.map((s) => [slugify(s.heading), s])
  )

  function findSection (normalizedSlug) {
    const exact = headingSlugToSection.get(normalizedSlug)
    if (exact) return exact

    const matches = [...headingSlugToSection]
      .filter(([slug]) =>
        slug.startsWith(normalizedSlug) &&
        slug[normalizedSlug.length] === '-')

    if (!matches.length) return null
    matches.sort((a, b) => b[0].length - a[0].length)
    return matches[0][1]
  }

  return {
    walkTokens (token) {
      if (token.type !== 'link') return

      const href = token.href ?? ''
      const stripped = href.startsWith('#') ? href.slice(1) : href

      if (knownNumbers.has(stripped)) {
        token.href = `/guidance-documents/${documentId}/sections/${encodeURIComponent(stripped)}`
        return
      }

      if (href.startsWith('#')) {
        const section = findSection(slugify(stripped))

        if (section) {
          const renderedId = slugify(`${section.number} ${section.heading}`)

          if (section.number === currentSectionNumber) {
            token.href = `#${renderedId}`
          } else {
            token.href = `/guidance-documents/${documentId}/sections/${encodeURIComponent(section.number)}#${renderedId}`
          }
        }
      }
    }
  }
}

export { rewriteIntraDocLinks }
