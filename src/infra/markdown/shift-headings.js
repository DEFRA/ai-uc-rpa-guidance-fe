const MIN_HEADING_DEPTH = 1
const MAX_HEADING_DEPTH = 6

const HEADING = /^(#{1,6})(\s)/
const FENCE = /^\s*(```|~~~)/

/**
 * Shift every heading in a section by a fixed amount, preserving relative nesting.
 *
 * The backend renders a section's own heading at `level + 1`, so a top-level
 * section starts at h2 and a deeply nested one at h4 or lower. Shifting lets the
 * viewer show every section's primary heading at the same depth whatever its place
 * in the document, and the headings below it at the depths that implies.
 *
 * Text rather than tokens, for the reason given in `intra-doc-links.js`: the
 * editor's schema and the server's Markdown pipeline both render this document and
 * have only the Markdown in common. Fenced code is skipped, so a `#` that is a
 * comment rather than a heading stays as written.
 *
 * @param {string} markdown
 * @param {number} by Positive promotes headings, so `## x` with `by: 1` is `# x`.
 * @returns {string}
 */
function shiftHeadings (markdown, by) {
  if (!by) {
    return markdown
  }

  let fenced = false

  return markdown
    .split('\n')
    .map((line) => {
      if (FENCE.test(line)) {
        fenced = !fenced
      }

      const heading = fenced ? null : HEADING.exec(line)

      if (!heading) {
        return line
      }

      const [prefix, hashes, space] = heading
      const depth = Math.min(
        MAX_HEADING_DEPTH,
        Math.max(MIN_HEADING_DEPTH, hashes.length - by)
      )

      return `${'#'.repeat(depth)}${space}${line.slice(prefix.length)}`
    })
    .join('\n')
}

export { shiftHeadings }
