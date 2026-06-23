/**
 * A `marked` extension that shifts every heading's depth by a fixed amount,
 * clamped to the valid h1–h6 range, preserving relative nesting.
 *
 * The backend renders a section's own heading at `level + 1` (so a top-level
 * section starts at h2 and a deeply nested one at h4+). Shifting lets the
 * viewer normalise each section so its primary heading reads as the page's
 * main heading regardless of where it sits in the document hierarchy.
 *
 * @param {{ by: number }} options Positive `by` promotes headings (smaller depth).
 * @returns {{ walkTokens: (token: object) => void }}
 */
const MIN_HEADING_DEPTH = 1
const MAX_HEADING_DEPTH = 6

function shiftHeadings (options = {}) {
  const { by = 0 } = options
  return {
    walkTokens (token) {
      if (token.type !== 'heading' || !by) {
        return
      }

      token.depth = Math.min(MAX_HEADING_DEPTH, Math.max(MIN_HEADING_DEPTH, token.depth - by))
    }
  }
}

export { shiftHeadings }
