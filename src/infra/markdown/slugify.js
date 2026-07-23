/**
 * Convert text to a URL-safe fragment identifier.
 * @param {string} text
 */
function slugify (text) {
  return (text ?? '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export { slugify }
