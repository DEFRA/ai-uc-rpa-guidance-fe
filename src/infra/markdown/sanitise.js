import sanitizeHtml from 'sanitize-html'

// Guidance Markdown is imported from Word documents and is now also editable by
// hand, and `marked` passes raw HTML straight through. Everything the renderer
// legitimately produces is listed here; anything else is dropped.
//
// This also removes stray form controls that document text smuggles in: a
// placeholder such as "v<input the version number of the guide used>" parses as
// a real <input> tag and used to put a text box in the middle of the guidance.
const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']

const SANITISE_OPTIONS = {
  allowedTags: [
    ...HEADING_TAGS,
    'p', 'a', 'span', 'br',
    'strong', 'em', 'b', 'i', 'u', 's', 'del', 'sup', 'sub',
    'ul', 'ol', 'li',
    'blockquote', 'code', 'pre', 'hr',
    'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ],
  allowedAttributes: {
    '*': ['class'],
    ...Object.fromEntries(HEADING_TAGS.map((tag) => [tag, ['class', 'id']])),
    a: ['class', 'href', 'title', 'target', 'rel'],
    img: ['class', 'src', 'alt'],
    th: ['class', 'scope'],
    td: ['class', 'scope']
  },
  // Relative URLs carry no scheme and stay allowed, so intra-document links and
  // proxied image paths keep working; `javascript:` does not.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  // Self-close void elements, matching what the renderer emits.
  selfClosing: ['br', 'hr', 'img']
}

/**
 * Strip anything from rendered guidance HTML that the renderer would not emit.
 *
 * @param {string} html Rendered, untrusted HTML.
 * @returns {string} HTML safe to interpolate into a template.
 */
function sanitiseGuidanceHtml (html) {
  return sanitizeHtml(html, SANITISE_OPTIONS)
}

export { sanitiseGuidanceHtml }
