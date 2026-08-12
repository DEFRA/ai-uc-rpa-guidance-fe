// A stored section file always opens with a generated heading line of the form
// "## {number} {heading}". The editor presents the heading text and the body as
// separate controls, so the two have to be pulled apart for display; the backend
// composes the line again on save, which is why there is no inverse here.
const HEADING_LINE = /^#{1,6}[ \t]+(.*)$/

// Only ASCII layout whitespace is trimmed. String.trim() would also strip
// U+00A0, but a non-breaking space is a character the author chose, and
// Word-derived guidance is full of them.
const SURROUNDING_WHITESPACE = /^[ \t\r\n]+|[ \t\r\n]+$/g

/**
 * Trim layout whitespace without touching content characters.
 *
 * @param {string} text
 * @returns {string}
 */
function trimLayoutWhitespace (text) {
  return text.replace(SURROUNDING_WHITESPACE, '')
}

/**
 * Remove exactly one leading section number from a heading line.
 *
 * Exactly one, because a heading may legitimately begin with a number: section 7
 * headed "7 day rule" is stored as "## 7 7 day rule", and removing more would
 * corrupt it.
 *
 * @param {string} text The heading line with its hashes already removed.
 * @param {string} sectionNumber The number this section is known by.
 * @returns {string} The heading text alone.
 */
function stripSectionNumber (text, sectionNumber) {
  if (text.startsWith(`${sectionNumber} `)) {
    return trimLayoutWhitespace(text.slice(sectionNumber.length + 1))
  }

  return text === sectionNumber ? '' : text
}

/**
 * Split a stored section file into its editable heading text and body.
 *
 * @param {string} markdown The raw section file as stored.
 * @param {string} sectionNumber The number this section is known by.
 * @returns {{ heading: string|null, body: string }} `heading` is null when the
 *   file has no heading line, leaving the caller to fall back to the manifest.
 */
function splitSectionMarkdown (markdown, sectionNumber) {
  const normalised = markdown.replace(/\r\n?/g, '\n')
  const [firstLine, ...remainingLines] = normalised.split('\n')
  const headingLine = HEADING_LINE.exec(firstLine)

  if (!headingLine) {
    return { heading: null, body: trimLayoutWhitespace(normalised) }
  }

  return {
    heading: stripSectionNumber(trimLayoutWhitespace(headingLine[1]), sectionNumber),
    body: trimLayoutWhitespace(remainingLines.join('\n'))
  }
}

export { splitSectionMarkdown }
