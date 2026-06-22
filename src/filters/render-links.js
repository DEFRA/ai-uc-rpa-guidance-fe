const QUOTES = new Set(['"', "'", '`'])

function anchor (href, label) {
  return `<a href="${href}" class="govuk-link" target="_blank" rel="noopener noreferrer">${label}</a>`
}

function matchMarkdownLink (text, at) {
  if (QUOTES.has(text[at - 1])) { return null }
  const closeSquare = text.indexOf(']', at + 1)
  if (closeSquare === -1 || text[closeSquare + 1] !== '(') { return null }
  const closeParen = text.indexOf(')', closeSquare + 2)
  if (closeParen === -1 || QUOTES.has(text[closeParen + 1])) { return null }
  return {
    end: closeParen + 1,
    html: anchor(text.slice(closeSquare + 2, closeParen), text.slice(at + 1, closeSquare))
  }
}

function matchBareUrl (text, at) {
  if (text[at - 1] === ']') { return null }
  const urlStart = at + 1
  if (!text.startsWith('https://', urlStart) && !text.startsWith('http://', urlStart)) { return null }
  const closeParen = text.indexOf(')', urlStart)
  if (closeParen === -1) { return null }
  const url = text.slice(urlStart, closeParen)
  return { end: closeParen + 1, html: anchor(url, url) }
}

/**
 * Converts unquoted markdown hyperlinks and bare parenthesised URLs to HTML anchors.
 * Links surrounded by backticks, single quotes, or double quotes are left as-is.
 * Handles two formats:
 *   [anchor text](url)  →  <a href="url">anchor text</a>
 *   (url)               →  <a href="url">url</a>  (bare URL, not preceded by ])
 *
 * @param {string} text
 * @param {number} [pos]
 * @returns {string}
 */
function renderLinks (text, pos = 0) {
  if (typeof text !== 'string') { return '' }
  const bracketPos = text.indexOf('[', pos)
  const parenPos = text.indexOf('(', pos)
  if (bracketPos === -1 && parenPos === -1) { return text.slice(pos) }

  const next = Math.min(
    bracketPos === -1 ? text.length : bracketPos,
    parenPos === -1 ? text.length : parenPos
  )

  const match = next === bracketPos
    ? matchMarkdownLink(text, next)
    : matchBareUrl(text, next)

  return match
    ? text.slice(pos, next) + match.html + renderLinks(text, match.end)
    : text.slice(pos, next + 1) + renderLinks(text, next + 1)
}

export { renderLinks }
