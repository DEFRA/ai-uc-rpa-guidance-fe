import { Editor } from '@tiptap/core'
import {
  toBrowserImagePaths,
  toStoredImagePaths
} from '../../../infra/markdown/editor-image-paths.js'
import { EXTENSIONS, TEXT_COLOURS } from './extensions.js'

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

// Names the Markdown pane, for sighted readers and assistive technology alike.
const SOURCE_LABEL = 'Markdown source'

const HISTORY_BUTTONS = [
  { command: 'undo', label: 'Undo', run: (chain) => chain.undo() },
  { command: 'redo', label: 'Redo', run: (chain) => chain.redo() }
]

// The toolbar stays here: which buttons it shows is a browser concern, while
// which extensions it loads decides the saved Markdown, so that half lives in
// extensions.js where a headless caller can share it.
//
// Every editor gets the same toolbar. A screen offering fewer controls would be
// a second Markdown flavour to keep in step with this one, and an editor moving
// between the section and document screens would find the same document
// formattable in two different ways.
const TOOLBAR_GROUPS = [
  BLOCK_BUTTONS,
  INLINE_BUTTONS,
  TABLE_BUTTONS,
  COLOUR_BUTTONS,
  HISTORY_BUTTONS
]

/**
 * Build one toolbar button.
 *
 * @param {import('@tiptap/core').Editor} editor
 * @param {object} spec One entry from a button group.
 * @returns {HTMLButtonElement}
 */
function createButton (editor, spec) {
  const button = document.createElement('button')

  // Explicitly not a submit button: it lives inside the edit form.
  button.type = 'button'
  button.className = [
    'govuk-button govuk-button--secondary app-editor__button app-editor__button--compact',
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
 * @returns {HTMLElement}
 */
function createToolbar (editor, groups) {
  const toolbar = document.createElement('div')
  toolbar.className = 'app-editor__toolbar'
  toolbar.setAttribute('role', 'toolbar')
  toolbar.setAttribute('aria-label', 'Formatting')

  for (const group of groups) {
    const element = document.createElement('div')
    element.className = 'app-editor__group'

    for (const spec of group) {
      element.append(createButton(editor, spec))
    }

    toolbar.append(element)
  }

  return toolbar
}

/**
 * Mount a WYSIWYG editor over a Markdown textarea, keeping both.
 *
 * The textarea stays the form's source of truth and stays visible: the same
 * document as text, editable in its own right, so anything the toolbar cannot
 * express can still be written by hand. With no JavaScript it is simply an
 * ordinary Markdown textarea.
 *
 * The two panes hand the document back and forth rather than mirroring on every
 * keystroke, which would mean serialising the whole document as the author
 * types. Focus is the handoff: the source is refreshed from the editor when the
 * author moves into it, and read back when they leave. `sourceEdited` records
 * which pane spoke last, so a save can never discard what was actually typed.
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

  // The form's own label names the textarea, which is now one of two controls,
  // so each is named for what it holds. The hint applies to both.
  const label = form.querySelector(`label[for="${textarea.id}"]`)

  const editor = new Editor({
    element: content,
    extensions: EXTENSIONS,
    content: toBrowserImagePaths(textarea.value, documentId),
    contentType: 'markdown',
    editorProps: {
      attributes: {
        'aria-label': label?.textContent.trim() || 'Content',
        'aria-describedby': `${textarea.id}-hint`
      }
    }
  })

  const caption = document.createElement('p')
  caption.className = 'app-editor__source-caption'
  caption.textContent = SOURCE_LABEL

  container.append(createToolbar(editor, TOOLBAR_GROUPS), content, caption)
  textarea.classList.add('app-editor__source')
  textarea.setAttribute('aria-label', SOURCE_LABEL)

  const writeThrough = () => {
    textarea.value = toStoredImagePaths(editor.getMarkdown(), documentId)
  }

  let sourceEdited = false

  textarea.addEventListener('focus', writeThrough)
  textarea.addEventListener('input', () => {
    sourceEdited = true
  })

  textarea.addEventListener('blur', () => {
    if (!sourceEdited) {
      return
    }

    editor.commands.setContent(
      toBrowserImagePaths(textarea.value, documentId),
      { contentType: 'markdown' }
    )

    // Written back so both panes show the text that a save would store, rather
    // than leaving the author guessing which of the two it would take.
    writeThrough()
    sourceEdited = false
  })

  form.addEventListener('submit', () => {
    // A save straight from the source pane, with no blur in between, keeps what
    // is in the box; anything else takes the editor's version.
    if (!sourceEdited) {
      writeThrough()
    }
  })

  return editor
}

export { mountGuidanceEditor }
