// Stored guidance Markdown embeds images by their backend path, which the
// browser cannot reach; this app proxies them on its own route. The read-only
// viewer rewrites them per token (see rewrite-image-paths.js), but the editor
// works on Markdown text and has to put the original paths back on save, so it
// needs an exactly reversible pair.
//
// Swapping the directory prefix is that pair: filenames cannot contain "/", so
// the two forms are unambiguous, and the mapping covers raw <img> tags as well
// as Markdown image syntax. Only the current document's images are touched.

/**
 * @param {string} documentId
 * @returns {string} The path prefix used in stored Markdown.
 */
function storedPrefix (documentId) {
  return `/guidance/documents/${documentId}/images/`
}

/**
 * @param {string} documentId
 * @returns {string} The path prefix this app serves images on.
 */
function browserPrefix (documentId) {
  return `/guidance-documents/${documentId}/assets/`
}

/**
 * Rewrite this document's image paths so the editor can display them.
 *
 * @param {string} markdown
 * @param {string} documentId
 * @returns {string}
 */
function toBrowserImagePaths (markdown, documentId) {
  return markdown.replaceAll(storedPrefix(documentId), browserPrefix(documentId))
}

/**
 * Restore the stored image paths before saving, so other consumers of the
 * Markdown keep working.
 *
 * @param {string} markdown
 * @param {string} documentId
 * @returns {string}
 */
function toStoredImagePaths (markdown, documentId) {
  return markdown.replaceAll(browserPrefix(documentId), storedPrefix(documentId))
}

export { toBrowserImagePaths, toStoredImagePaths }
