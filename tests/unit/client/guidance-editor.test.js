// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from 'vitest'

import { mountGuidanceEditor } from '../../../src/client/javascripts/guidance-editor/mount.js'

const DOCUMENT_ID = 'doc-1'

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
