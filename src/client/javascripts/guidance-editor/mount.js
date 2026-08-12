import { Editor } from '@tiptap/core'
import { Image } from '@tiptap/extension-image'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'

import {
  toBrowserImagePaths,
  toStoredImagePaths
} from '../../../infra/markdown/editor-image-paths.js'

// Buttons are declared as data, so the toolbar markup and the command wiring
// cannot drift apart.
const TOOLBAR_BUTTONS = [
  { command: 'bold', label: 'Bold', run: (chain) => chain.toggleBold() },
  { command: 'italic', label: 'Italic', run: (chain) => chain.toggleItalic() },
  { command: 'bulletList', label: 'Bullets', run: (chain) => chain.toggleBulletList() },
  { command: 'orderedList', label: 'Numbers', run: (chain) => chain.toggleOrderedList() }
]

// Underline is deliberately off: its serialiser emits `++text++`, which is not
// Markdown, so `marked` would render the plus signs literally to readers.
const EXTENSIONS = [
  StarterKit.configure({ underline: false }),
  Image,
  Table,
  TableRow,
  TableCell,
  TableHeader,
  Markdown
]

/**
 * Build the toolbar for an editor instance.
 *
 * @param {import('@tiptap/core').Editor} editor
 * @returns {HTMLElement}
 */
function createToolbar (editor) {
  const toolbar = document.createElement('div')
  toolbar.className = 'app-editor__toolbar'
  toolbar.setAttribute('role', 'toolbar')
  toolbar.setAttribute('aria-label', 'Formatting')

  for (const { command, label, run } of TOOLBAR_BUTTONS) {
    const button = document.createElement('button')
    // Explicitly not a submit button: it lives inside the edit form.
    button.type = 'button'
    button.className = 'govuk-button govuk-button--secondary app-editor__button'
    button.dataset.editorCommand = command
    button.textContent = label
    button.addEventListener('click', () => run(editor.chain().focus()).run())
    toolbar.append(button)
  }

  return toolbar
}

/**
 * Replace a Markdown textarea with a WYSIWYG editor over the same content.
 *
 * The textarea stays the form's source of truth: it is hidden rather than
 * removed, and refreshed from the editor on submit. With no JavaScript it is
 * simply an ordinary Markdown textarea.
 *
 * @param {HTMLTextAreaElement} textarea
 * @returns {import('@tiptap/core').Editor|null} The editor, or null if it could
 *   not be mounted.
 */
function mountGuidanceEditor (textarea) {
  const form = textarea.form
  const documentId = textarea.dataset.documentId

  if (!form || !documentId) {
    return null
  }

  const container = document.createElement('div')
  container.className = 'app-editor'
  textarea.insertAdjacentElement('beforebegin', container)

  const content = document.createElement('div')
  content.className = 'app-editor__content'

  const editor = new Editor({
    element: content,
    extensions: EXTENSIONS,
    content: toBrowserImagePaths(textarea.value, documentId),
    contentType: 'markdown',
    editorProps: {
      attributes: {
        // Associate the editable region with the textarea's existing label and hint.
        'aria-labelledby': `${textarea.id}-label`,
        'aria-describedby': `${textarea.id}-hint`
      }
    }
  })

  container.append(createToolbar(editor), content)
  textarea.hidden = true

  form.addEventListener('submit', () => {
    textarea.value = toStoredImagePaths(editor.getMarkdown(), documentId)
  })

  return editor
}

export { mountGuidanceEditor }
