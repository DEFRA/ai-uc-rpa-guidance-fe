import { Editor } from '@tiptap/core'
Mar
import {
  toBrowserImagePaths,
  toStoredImagePaths
} from '../../../infra/markdown/editor-image-paths.js'
import { EXTENSION_VARIANTS, TEXT_COLOURS } from './extensions.js'

// Buttons are declared as data, so the toolbar markup and the command wiring
// cannot drift apart. They are grouped so that a long toolbar wraps into
// meaningful clusters rather than one undifferentiated run.
const INLINE_BUTTONS = [
  { command: 'bold', label: 'Bold', run: (chain) => chain.toggleBold() },
  { command: 'italic', label: 'Italic', run: (chain) => chain.toggleItalic() },
  { command: 'bulletList', label: 'Bullets', run: (chain) => chain.toggleBulletList() },
  { command: 'orderedList', label: 'Numbers', run: (chain) => chain.toggleOrderedList() }
]

// Level 1 is deliberately absent: the document title is its own form field, so
// the body should never contain a second top-level heading.
const BLOCK_BUTTONS = [
  { command: 'heading2', label: 'H2', run: (chain) => chain.toggleHeading({ level: 2 }) },
  { command: 'heading3', label: 'H3', run: (chain) => chain.toggleHeading({ level: 3 }) },
  { command: 'heading4', label: 'H4', run: (chain) => chain.toggleHeading({ level: 4 }) },
  { command: 'paragraph', label: 'Text', run: (chain) => chain.setParagraph() },
  { command: 'blockquote', label: 'Quote', run: (chain) => chain.toggleBlockquote() },
  { command: 'codeBlock', label: 'Code', run: (chain) => chain.toggleCodeBlock() },
  { command: 'horizontalRule', label: 'Rule', run: (chain) => chain.setHorizontalRule() }
]

// mergeCells and splitCell are deliberately absent: Markdown pipe tables cannot
// express colspan or rowspan, so those commands would build a table that
// getMarkdown() has no way to serialise.
const TABLE_BUTTONS = [
  {
    command: 'insertTable',
    label: 'Table',
    run: (chain) => chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
  },
  { command: 'addRowAfter', label: 'Row +', run: (chain) => chain.addRowAfter() },
  { command: 'deleteRow', label: 'Row −', run: (chain) => chain.deleteRow() },
  { command: 'addColumnAfter', label: 'Col +', run: (chain) => chain.addColumnAfter() },
  { command: 'deleteColumn', label: 'Col −', run: (chain) => chain.deleteColumn() },
  { command: 'toggleHeaderRow', label: 'Header', run: (chain) => chain.toggleHeaderRow() },
  { command: 'deleteTable', label: 'Delete table', run: (chain) => chain.deleteTable() }
]

const COLOUR_BUTTONS = [
  ...TEXT_COLOURS.map(({ command, hex, name, modifier }) => ({
    command,
    label: '',
    ariaLabel: name,
    classes: `app-editor__swatch app-editor__swatch--${modifier}`,
    run: (chain) => chain.setColor(hex)
  })),
  // Highlight stays single-colour: with `multicolor` off it renders a bare
  // <mark>, so there is no inline style to be dropped.
  { command: 'highlight', label: '', ariaLabel: 'Highlight', classes: 'app-editor__swatch app-editor__swatch--yellow', run: (chain) => chain.toggleHighlight() },
  { command: 'unsetColor', label: 'Clear', ariaLabel: 'Remove colour and highlight', run: (chain) => chain.unsetColor().unsetHighlight() }
]

const HISTORY_BUTTONS = [
  { command: 'undo', label: 'Undo', run: (chain) => chain.undo() },
  { command: 'redo', label: 'Redo', run: (chain) => chain.redo() }
]

// The toolbars stay here: which buttons a variant shows is a browser concern,
// while which extensions it loads decides the saved Markdown, so that half lives
// in extensions.js where a headless caller can share it.
const VARIANTS = {
  section: {
    extensions: EXTENSION_VARIANTS.section,
    groups: [INLINE_BUTTONS],
    compact: false
  },
  document: {
    extensions: EXTENSION_VARIANTS.document,
    groups: [BLOCK_BUTTONS, INLINE_BUTTONS, TABLE_BUTTONS, COLOUR_BUTTONS, HISTORY_BUTTONS],
    compact: true
  }
}

/**
 * Build one toolbar button.
 *
 * @param {import('@tiptap/core').Editor} editor
 * @param {object} spec One entry from a button group.
 * @param {boolean} compact Whether to shrink the button to toolbar size.
 * @returns {HTMLButtonElement}
 */
function createButton (editor, spec, compact) {
  const button = document.createElement('button')

  // Explicitly not a submit button: it lives inside the edit form.
  button.type = 'button'
  button.className = [
    'govuk-button govuk-button--secondary app-editor__button',
    compact ? 'app-editor__button--compact' : '',
    spec.classes ?? ''
  ]
    .filter(Boolean)
    .join(' ')
  button.dataset.editorCommand = spec.command
  button.textContent = spec.label

  // Swatches have no visible text, so they carry their name for assistive
  // technology and as a tooltip for everyone else.
  if (spec.ariaLabel) {
    button.setAttribute('aria-label', spec.ariaLabel)
    button.title = spec.ariaLabel
  }

  button.addEventListener('click', () => spec.run(editor.chain().focus()).run())

  return button
}

/**
 * Build the toolbar for an editor instance.
 *
 * @param {import('@tiptap/core').Editor} editor
 * @param {object[][]} groups Button specs, one array per visual group.
 * @param {boolean} compact
 * @returns {HTMLElement}
 */
function createToolbar (editor, groups, compact) {
  const toolbar = document.createElement('div')
  toolbar.className = 'app-editor__toolbar'
  toolbar.setAttribute('role', 'toolbar')
  toolbar.setAttribute('aria-label', 'Formatting')

  for (const group of groups) {
    const element = document.createElement('div')
    element.className = 'app-editor__group'

    for (const spec of group) {
      element.append(createButton(editor, spec, compact))
    }

    toolbar.append(element)
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
 * `data-editor-toolbar` selects the variant; an absent attribute keeps the
 * single-section toolbar the editor shipped with.
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

  const variant = VARIANTS[textarea.dataset.editorToolbar] ?? VARIANTS.section

  const container = document.createElement('div')
  container.className = 'app-editor'
  textarea.insertAdjacentElement('beforebegin', container)

  const content = document.createElement('div')
  content.className = 'app-editor__content'

  const editor = new Editor({
    element: content,
    extensions: variant.extensions,
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

  container.append(
    createToolbar(editor, variant.groups, variant.compact),
    content
  )
  textarea.hidden = true

  form.addEventListener('submit', () => {
    textarea.value = toStoredImagePaths(editor.getMarkdown(), documentId)
  })

  return editor
}

export { mountGuidanceEditor }
