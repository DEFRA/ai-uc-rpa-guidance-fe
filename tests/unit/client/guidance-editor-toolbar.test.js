// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from 'vitest'

import { mountGuidanceEditor } from '../../../src/client/javascripts/guidance-editor/mount.js'

const DOCUMENT_ID = 'doc-1'

// jsdom implements no layout, so ProseMirror throws when it measures a
// non-empty selection to scroll it into view. Reporting no rectangles is
// enough: the editor then has nothing to scroll to.
globalThis.Range.prototype.getClientRects ??= () => []
globalThis.Range.prototype.getBoundingClientRect ??= () => ({
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  width: 0,
  height: 0,
  x: 0,
  y: 0
})

function mount (markdown = 'Some text.') {
  document.body.innerHTML = `
    <form method="post" action="/guidance-documents/${DOCUMENT_ID}/edit">
      <textarea id="markdown" name="markdown"
        data-module="guidance-editor"
        data-document-id="${DOCUMENT_ID}"></textarea>
      <button type="submit">Save document</button>
    </form>
  `
  const textarea = document.getElementById('markdown')
  textarea.value = markdown
  const editor = mountGuidanceEditor(textarea)
  return { textarea, editor }
}

const button = (command) =>
  document.querySelector(`[data-editor-command="${command}"]`)

// Selected through the editor rather than the DOM: jsdom's selection is not
// the one ProseMirror reads, so a mark command would have nothing to apply to.
function selectAll (editor) {
  editor.commands.selectAll()
}

function saved (textarea) {
  document.querySelector('form').dispatchEvent(new Event('submit'))
  return textarea.value
}

describe('#guidanceEditor toolbar', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  test('Should apply an inline mark to the selection', () => {
    const { textarea, editor } = mount('Some text.')
    selectAll(editor)

    button('bold').click()

    expect(saved(textarea)).toContain('**Some text.**')
  })

  test('Should turn a paragraph into a heading, and back', () => {
    const { textarea, editor } = mount('A heading.')
    selectAll(editor)

    button('heading2').click()
    expect(saved(textarea)).toContain('## A heading.')

    button('paragraph').click()
    expect(saved(textarea)).not.toContain('## ')
  })

  test('Should turn a paragraph into a list item', () => {
    const { textarea, editor } = mount('One thing.')
    selectAll(editor)

    button('bulletList').click()

    expect(saved(textarea)).toContain('- One thing.')
  })

  test('Should insert a table with a header row', () => {
    const { textarea, editor } = mount('Before the table.')
    selectAll(editor)

    button('insertTable').click()

    expect(saved(textarea)).toContain('|')
    expect(saved(textarea)).toContain('---')
  })

  test('Should colour the selection and clear it again', () => {
    const { textarea, editor } = mount('Coloured text.')
    selectAll(editor)

    button('colorRed').click()
    expect(saved(textarea)).toContain('{.red}')

    selectAll(editor)
    button('unsetColor').click()
    expect(saved(textarea)).not.toContain('{.red}')
  })

  test('Should undo an edit made from the toolbar', () => {
    const { textarea, editor } = mount('Plain text.')
    selectAll(editor)
    button('bold').click()

    button('undo').click()

    expect(saved(textarea)).not.toContain('**')
  })

  // Every button is a command on a chain, and a command whose extension is not
  // in EXTENSIONS throws when it runs. Pressing each one is what proves the
  // toolbar and the extension list still agree with each other.
  test('Should run every toolbar command against the document', () => {
    const { editor } = mount('Some text to work on.')
    selectAll(editor)

    const buttons = [...document.querySelectorAll('[data-editor-command]')]
    expect(buttons.length).toBeGreaterThan(20)

    for (const control of buttons) {
      expect(() => control.click()).not.toThrow()
    }
  })
})

describe('#guidanceEditor source pane', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  test('Should keep the editor content when the source was only looked at', () => {
    const { textarea } = mount('Untouched text.')

    textarea.dispatchEvent(new Event('focus'))
    textarea.dispatchEvent(new Event('blur'))

    expect(saved(textarea)).toContain('Untouched text.')
  })

  test('Should take an edit typed into the source pane', () => {
    const { textarea } = mount('Original text.')

    textarea.dispatchEvent(new Event('focus'))
    textarea.value = 'Replaced text.'
    textarea.dispatchEvent(new Event('input'))
    textarea.dispatchEvent(new Event('blur'))

    expect(textarea.value).toContain('Replaced text.')
    expect(document.querySelector('.ProseMirror').textContent)
      .toContain('Replaced text.')
  })
})
