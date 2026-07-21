/**
 * Convert a heading's plain text to a URL-safe fragment identifier.
 *
 * Lowercase, replace non-alphanumeric runs with a single hyphen, strip
 * leading/trailing hyphens.
 *
 * @param {string} text
 * @returns {string}
 */
function slugify (text) {
  return (text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export { slugify }
