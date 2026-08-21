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

function renderForm (markdown) {
  document.body.innerHTML = `
    <form method="post" action="/guidance-documents/${DOCUMENT_ID}/sections/7.2/edit">
      <textarea id="markdown" name="markdown"
        data-module="guidance-editor"
        data-document-id="${DOCUMENT_ID}"></textarea>
      <button type="submit">Save section</button>
    </form>
  `
  const textarea = document.getElementById('markdown')
  textarea.value = markdown
  return { form: document.querySelector('form'), textarea }
}

function renderDocumentForm (markdown) {
  document.body.innerHTML = `
    <form method="post" action="/guidance-documents/${DOCUMENT_ID}/edit">
      <textarea id="markdown" name="markdown"
        data-module="guidance-editor"
        data-document-id="${DOCUMENT_ID}"
        data-editor-toolbar="document"></textarea>
      <button type="submit">Save document</button>
    </form>
  `
  const textarea = document.getElementById('markdown')
  textarea.value = markdown
  return { form: document.querySelector('form'), textarea }
}

describe('#mountGuidanceEditor', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  test('Should hide the textarea once the editor is mounted', () => {
    const { textarea } = renderForm('Some text.')

    mountGuidanceEditor(textarea)

    expect(textarea.hidden).toBe(true)
  })

  test('Should render an editable region showing the content', () => {
    const { textarea } = renderForm('Some body text.')

    mountGuidanceEditor(textarea)

    const editable = document.querySelector('.ProseMirror')
    expect(editable).not.toBeNull()
    expect(editable.getAttribute('contenteditable')).toBe('true')
    expect(editable.textContent).toContain('Some body text.')
  })

  test('Should write markdown back into the textarea on submit', () => {
    const { form, textarea } = renderForm('Plain paragraph.')

    mountGuidanceEditor(textarea)
    // The editor owns the content now; prove the textarea is refreshed from it.
    textarea.value = 'stale'
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))

    expect(textarea.value.trim()).toBe('Plain paragraph.')
  })

  test('Should restore stored image paths on submit', () => {
    // The editor needs browser-servable paths to display images, but stored
    // markdown must keep the backend paths other consumers rely on.
    const stored = '![Diagram](/guidance/documents/doc-1/images/img_1.png)'
    const { form, textarea } = renderForm(stored)

    mountGuidanceEditor(textarea)
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))

    expect(textarea.value).toContain('/guidance/documents/doc-1/images/img_1.png')
    expect(textarea.value).not.toContain('/guidance-documents/doc-1/assets/')
  })

  test('Should show images using the browser-servable path', () => {
    const { textarea } = renderForm('![Diagram](/guidance/documents/doc-1/images/img_1.png)')

    mountGuidanceEditor(textarea)

    const img = document.querySelector('.ProseMirror img')
    expect(img?.getAttribute('src')).toBe('/guidance-documents/doc-1/assets/img_1.png')
  })

  test('Should offer a toolbar wired to editor commands', () => {
    const { textarea } = renderForm('Some text.')

    mountGuidanceEditor(textarea)

    const bold = document.querySelector('[data-editor-command="bold"]')
    expect(bold).not.toBeNull()
    // Buttons must not submit the form they live in.
    expect(bold.getAttribute('type')).toBe('button')
  })

  test('Should preserve a heading-free body with lists', () => {
    const { form, textarea } = renderForm('- one\n- two')

    mountGuidanceEditor(textarea)
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))

    expect(textarea.value).toContain('- one')
    expect(textarea.value).toContain('- two')
  })

  test('Should not emit non-standard underline syntax', () => {
    // Underline is disabled: marked has no `++text++` syntax and would render the
    // plus signs literally.
    const { form, textarea } = renderForm('Some <u>underlined</u> text.')

    mountGuidanceEditor(textarea)
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))

    expect(textarea.value).not.toContain('++')
  })

  test('Should leave an empty body empty', () => {
    const { form, textarea } = renderForm('')

    mountGuidanceEditor(textarea)
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))

    expect(textarea.value.trim()).toBe('')
  })

  test('Should return null and not throw when the textarea has no form', () => {
    document.body.innerHTML = '<textarea id="markdown" data-document-id="doc-1"></textarea>'

    expect(() => mountGuidanceEditor(document.getElementById('markdown'))).not.toThrow()
  })
})

describe('#mountGuidanceEditor with the document toolbar', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  test('Should keep the section toolbar to its four buttons', () => {
    const { textarea } = renderForm('Some text.')

    mountGuidanceEditor(textarea)

    const commands = [...document.querySelectorAll('[data-editor-command]')].map(
      (button) => button.dataset.editorCommand
    )
    expect(commands).toEqual(['bold', 'italic', 'bulletList', 'orderedList'])
  })

  test('Should offer block, table, colour and history commands', () => {
    const { textarea } = renderDocumentForm('Some text.')

    mountGuidanceEditor(textarea)

    const commands = [...document.querySelectorAll('[data-editor-command]')].map(
      (button) => button.dataset.editorCommand
    )

    for (const command of [
      'heading2', 'heading3', 'heading4', 'paragraph', 'blockquote',
      'codeBlock', 'horizontalRule',
      'bold', 'italic', 'bulletList', 'orderedList',
      'insertTable', 'addRowAfter', 'deleteRow', 'addColumnAfter',
      'deleteColumn', 'toggleHeaderRow', 'deleteTable',
      'colorRed', 'colorBlue', 'colorGreen', 'colorBlack',
      'highlight', 'unsetColor',
      'undo', 'redo'
    ]) {
      expect(commands).toContain(command)
    }
  })

  test('Should not offer cell merging, which Markdown cannot express', () => {
    const { textarea } = renderDocumentForm('Some text.')

    mountGuidanceEditor(textarea)

    expect(document.querySelector('[data-editor-command="mergeCells"]')).toBeNull()
    expect(document.querySelector('[data-editor-command="splitCell"]')).toBeNull()
  })

  test('Should group the toolbar buttons', () => {
    const { textarea } = renderDocumentForm('Some text.')

    mountGuidanceEditor(textarea)

    expect(document.querySelectorAll('.app-editor__group').length).toBe(5)
  })

  test('Should give colour swatches an accessible name', () => {
    const { textarea } = renderDocumentForm('Some text.')

    mountGuidanceEditor(textarea)

    const swatch = document.querySelector('[data-editor-command="colorRed"]')
    expect(swatch.textContent).toBe('')
    expect(swatch.getAttribute('aria-label')).toBe('Red text')
    expect(swatch.type).toBe('button')
  })

  test('Should apply text colour as a class, not only an inline style', () => {
    const { textarea } = renderDocumentForm('Colour me.')

    const editor = mountGuidanceEditor(textarea)
    editor.commands.selectAll()
    document.querySelector('[data-editor-command="colorRed"]').click()

    const span = document.querySelector('.ProseMirror span[data-colour]')
    expect(span).not.toBeNull()
    // The class is what survives a style-src without 'unsafe-inline'.
    expect(span.className).toContain('app-editor__text--red')
    expect(span.getAttribute('data-colour')).toBe('#d4351c')
  })

  test('Should highlight with a bare mark, carrying no inline style', () => {
    const { textarea } = renderDocumentForm('Highlight me.')

    const editor = mountGuidanceEditor(textarea)
    editor.commands.selectAll()
    document.querySelector('[data-editor-command="highlight"]').click()

    const mark = document.querySelector('.ProseMirror mark')
    expect(mark).not.toBeNull()
    expect(mark.getAttribute('style')).toBeNull()
  })

  test('Should insert a table that survives the Markdown round trip', () => {
    const { form, textarea } = renderDocumentForm('Intro text.')

    mountGuidanceEditor(textarea)
    document.querySelector('[data-editor-command="insertTable"]').click()
    form.dispatchEvent(new Event('submit'))

    expect(textarea.value).toContain('|')
  })

  test('Should apply a heading to the whole document body', () => {
    const { form, textarea } = renderDocumentForm('Overview')

    mountGuidanceEditor(textarea)
    document.querySelector('[data-editor-command="heading2"]').click()
    form.dispatchEvent(new Event('submit'))

    expect(textarea.value).toContain('## Overview')
  })
})
