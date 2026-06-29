const BACKEND_IMAGE_PATH = /^\/guidance\/documents\/([^/?]+)\/images\/([^/?]+)$/

/**
 * A `marked` extension that rewrites image `src` attributes so they point at
 * the BFF asset-proxy endpoint rather than the back-end API directly.
 *
 * The back-end embeds paths of the form
 *   /guidance/documents/{documentId}/images/{filename}
 * which the browser cannot reach.  This extension rewrites them to
 *   /guidance-documents/{documentId}/assets/{filename}
 * which is served by the BFF proxy route.
 *
 * Only images belonging to the *current* document are rewritten; references
 * to other documents or external URLs are left untouched.
 *
 * @param {{ documentId: string }} options
 * @returns {{ walkTokens: (token: object) => void }}
 */
function rewriteImagePaths (options) {
  const { documentId } = options

  return {
    walkTokens (token) {
      if (token.type !== 'image') {
        return
      }

      const match = BACKEND_IMAGE_PATH.exec(token.href ?? '')
      if (match?.[1] !== documentId) {
        return
      }

      token.href = `/guidance-documents/${documentId}/assets/${match[2]}`
    }
  }
}

export { rewriteImagePaths }
