import { Editor } from '@tiptap/core'

import { EXTENSIONS } from '../guidance-editor/extensions.js'

/**
 * Show a section as the editor's schema understands it, in place of the
 * server-rendered HTML.
 *
 * Reading and editing are one document seen twice, so they are rendered by one
 * thing: the extension list in `guidance-editor/extensions.js` is what decides
 * both what a reader sees here and what an author can keep on save. A construct
 * this page cannot show is therefore one the editor would drop -- which is the
 * point of rendering it this way rather than with a second Markdown pipeline
 * that would quietly be more capable than the editor is.
 *
 * The server's HTML stays in the page until this succeeds, so a browser that
 * runs no JavaScript, or one where this throws, still has the section to read.
 *
 * @param {HTMLElement} container The element holding the Markdown and fallback.
 * @returns {import('@tiptap/core').Editor|null} The viewer, or null if there was
 *   no Markdown to render.
 */
function mountGuidanceViewer (container) {
  const source = container.querySelector('[data-guidance-markdown]')

  if (!source) {
    return null
  }

  const content = document.createElement('div')
  content.className = 'app-guidance-content__rendered'

  const editor = new Editor({
    element: content,
    extensions: EXTENSIONS,
    // @tiptap/markdown parses Markdown natively, so the section goes in as it is
    // with no conversion of our own in between.
    content: source.value,
    contentType: 'markdown',
    // A viewer, not an editor: this screen is for reading, and editing has its
    // own page behind the button below.
    editable: false
  })

  container.replaceChildren(content)

  return editor
}

export { mountGuidanceViewer }
