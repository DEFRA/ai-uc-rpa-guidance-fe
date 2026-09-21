import { mergeAttributes } from '@tiptap/core'
import { Link } from '@tiptap/extension-link'

/**
 * Matches an absolute URI with a scheme (`https:`, `mailto:`) or a
 * protocol-relative URL (`//host`). Deliberately does not match a path, so the
 * section links this application writes count as internal. The same rule as the
 * server's renderer uses -- see `infra/markdown/govuk-renderer.js`.
 */
const EXTERNAL_HREF = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i

/**
 * The link mark, with a new tab reserved for links that leave the service.
 *
 * Tiptap sends every link to `target="_blank"`, which is the safe default for an
 * editor that knows nothing about where its links point. This one does know: a
 * cross-reference between two sections of the same guide is a page in this
 * service, and opening each one in its own tab would leave a reader working
 * through a document behind a row of them.
 *
 * Display only -- a link's Markdown is its text and its destination, so nothing
 * here changes what a save would store.
 */
const GuidanceLink = Link.extend({
  renderHTML ({ HTMLAttributes }) {
    const destination = HTMLAttributes.href ?? ''
    const external = EXTERNAL_HREF.test(destination)
      ? { target: '_blank', rel: 'noopener noreferrer' }
      : { target: null, rel: null }

    return [
      'a',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, external),
      0
    ]
  }
})

export { GuidanceLink }
