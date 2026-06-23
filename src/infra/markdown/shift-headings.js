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
function shiftHeadings ({ by = 0 } = {}) {
  return {
    walkTokens (token) {
      if (token.type !== 'heading' || !by) {
        return
      }

      token.depth = Math.min(6, Math.max(1, token.depth - by))
    }
  }
}

export { shiftHeadings }
