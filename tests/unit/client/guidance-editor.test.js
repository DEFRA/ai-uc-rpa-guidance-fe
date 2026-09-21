// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from 'vitest'

import { mountGuidanceEditor } from '../../../src/client/javascripts/guidance-editor/mount.js'
import { colouredText } from '../../../src/infra/markdown/coloured-text.js'
import { govukRenderer } from '../../../src/infra/markdown/govuk-renderer.js'
import { createMarkdown } from '../../../src/infra/markdown/markdown.js'
import { sanitiseGuidanceHtml } from '../../../src/infra/markdown/sanitise.js'

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
        data-document-id="${DOCUMENT_ID}"></textarea>
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

  test('Should keep the Markdown source visible beside the editor', () => {
    const { textarea } = renderForm('Some text.')

    mountGuidanceEditor(textarea)

    expect(textarea.hidden).toBe(false)
    // Two controls now, so each must say which it is.
    expect(textarea.getAttribute('aria-label')).toBe('Markdown source')
    expect(document.querySelector('.ProseMirror').getAttribute('aria-label'))
      .toBe('Content')
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

function toolbarCommands () {
  return [...document.querySelectorAll('[data-editor-command]')].map(
    (button) => button.dataset.editorCommand
  )
}

describe('#mountGuidanceEditor toolbar', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  test('Should offer the section form the same toolbar as the document form', () => {
    const { textarea } = renderDocumentForm('Some text.')
    mountGuidanceEditor(textarea)
    const documentCommands = toolbarCommands()

    document.body.innerHTML = ''
    mountGuidanceEditor(renderForm('Some text.').textarea)

    expect(toolbarCommands()).toEqual(documentCommands)
  })

  test('Should offer block, table, colour and history commands', () => {
    const { textarea } = renderDocumentForm('Some text.')

    mountGuidanceEditor(textarea)

    const commands = toolbarCommands()

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

    // The class is what survives a style-src without 'unsafe-inline'.
    const span = document.querySelector('.ProseMirror span.app-editor__text--red')
    expect(span).not.toBeNull()
    expect(span.textContent).toBe('Colour me.')
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

// Colour has no Markdown syntax, so it is written as a Pandoc-style bracketed
// span: `[text]{.red}`. That only holds if both ends agree on the syntax, and
// each leg here is the real one -- the editor the browser mounts, the form
// submit that fills the textarea the controller posts, and the render pipeline
// the viewer page uses.
describe('#mountGuidanceEditor colour round trip', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  /** Mount an editor over `markdown`, apply `edit`, then save as the form does. */
  function save (markdown, edit = () => {}) {
    document.body.innerHTML = ''
    const { form, textarea } = renderForm(markdown)
    const editor = mountGuidanceEditor(textarea)

    editor.commands.selectAll()
    edit(editor)
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))

    return textarea.value
  }

  /** Render saved Markdown the way the section viewer does. */
  function read (markdown) {
    return sanitiseGuidanceHtml(
      createMarkdown().use(govukRenderer()).use(colouredText()).render(markdown)
    )
  }

  /** Reopen saved Markdown in a new editor, as the edit page does. */
  function reopen (markdown) {
    document.body.innerHTML = ''
    const { textarea } = renderForm(markdown)
    mountGuidanceEditor(textarea)

    return document.querySelector('.ProseMirror').innerHTML
  }

  test('Should save text colour as a bracketed span', () => {
    const saved = save('Colour me.', (editor) =>
      editor.chain().focus().setColor('#d4351c').run()
    )

    expect(saved).toBe('[Colour me.]{.red}')
  })

  test('Should show the reader the colour, by class rather than by style', () => {
    const html = read(save('Colour me.', (editor) =>
      editor.chain().focus().setColor('#00703c').run()
    ))

    expect(html).toContain('<span class="app-editor__text--green">Colour me.</span>')
    // The sanitiser drops a style attribute, so it cannot be what carries the
    // colour; nothing of the syntax may reach the reader either.
    expect(html).not.toContain('style=')
    expect(html).not.toContain('{.')
  })

  test('Should restore the colour when the saved section is reopened', () => {
    const saved = save('Colour me.', (editor) =>
      editor.chain().focus().setColor('#1d70b8').run()
    )

    expect(reopen(saved)).toContain('class="app-editor__text--blue"')
  })

  test('Should keep Markdown formatting inside a coloured span', () => {
    // The span is claimed by a tokenizer on both sides, so its contents stay
    // Markdown. Parsed as raw text, the `**` would come back as literal
    // asterisks and the bold would be lost on the next save.
    const saved = save('Colour me.', (editor) =>
      editor.chain().focus().setColor('#1d70b8').toggleBold().run()
    )

    expect(saved).toBe('[**Colour me.**]{.blue}')
    expect(read(saved)).toContain('<strong>Colour me.</strong>')
    expect(reopen(saved)).toContain('<strong>Colour me.</strong>')
  })

  test('Should colour only the selected words', () => {
    const saved = save('Red then plain.', (editor) =>
      editor.chain().focus().setTextSelection({ from: 1, to: 4 }).setColor('#d4351c').run()
    )

    expect(saved).toBe('[Red]{.red} then plain.')
    expect(read(saved)).toContain('</span> then plain.')
  })

  test('Should survive a second edit cycle unchanged', () => {
    // Save, reopen, save again: an editor who opens a coloured section and
    // saves without touching it must not change the file.
    const first = save('Colour me.', (editor) =>
      editor.chain().focus().setColor('#0b0c0c').run()
    )

    expect(save(first)).toBe(first)
  })

  test('Should leave an ordinary link alone', () => {
    // Both tokenizers start looking at `[`, so a link is the syntax they are
    // most likely to steal.
    const saved = save('A [link](/x) stays a link.')

    expect(saved).toBe('A [link](/x) stays a link.')
    expect(read(saved)).toContain('href="/x"')
  })

  test('Should leave a class it does not recognise as literal text', () => {
    // Neither tokenizer claims it, so the brackets are ordinary punctuation and
    // the serialiser escapes them to keep them that way. What the reader sees is
    // still the words as typed.
    const saved = save('Say [nothing]{.mauve} of it.')

    expect(saved).toBe('Say \\[nothing\\]{.mauve} of it.')
    expect(read(saved)).toContain('[nothing]{.mauve}')
  })

  test('Should leave uncoloured text free of syntax', () => {
    expect(save('Just words.')).toBe('Just words.')
  })
})

// The Markdown source is a second view of the same document, not a preview: what
// is typed there is what gets saved. Focus is the handoff between the two panes.
describe('#mountGuidanceEditor Markdown source', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  /** Type into the source pane the way a person does: text, then an input event. */
  function typeInSource (textarea, markdown) {
    textarea.value = markdown
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  }

  const blur = (element) => element.dispatchEvent(new Event('blur'))
  const focus = (element) => element.dispatchEvent(new Event('focus'))
  const submit = (form) =>
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))

  test('Should save what was typed into the source', () => {
    const { form, textarea } = renderForm('Original text.')

    mountGuidanceEditor(textarea)
    typeInSource(textarea, 'Typed by hand.')
    submit(form)

    expect(textarea.value).toContain('Typed by hand.')
    expect(textarea.value).not.toContain('Original text.')
  })

  test('Should save a hand-typed edit that never left the source pane', () => {
    // Saving with the caret still in the box must not lose the last keystrokes.
    const { form, textarea } = renderForm('Original text.')

    mountGuidanceEditor(textarea)
    typeInSource(textarea, '- one\n- two')
    submit(form)

    expect(textarea.value).toBe('- one\n- two')
  })

  test('Should show a hand-typed edit in the editor once focus leaves', () => {
    const { textarea } = renderForm('Original text.')

    mountGuidanceEditor(textarea)
    typeInSource(textarea, '## A heading typed by hand')
    blur(textarea)

    const editable = document.querySelector('.ProseMirror')
    expect(editable.querySelector('h2')?.textContent).toBe('A heading typed by hand')
  })

  test('Should refresh the source from the editor when the source is focused', () => {
    const { textarea } = renderForm('Original text.')

    const editor = mountGuidanceEditor(textarea)
    editor.commands.selectAll()
    editor.chain().focus().toggleBold().run()
    focus(textarea)

    expect(textarea.value).toBe('**Original text.**')
  })

  test('Should take the editor\'s version when the source was not touched', () => {
    const { form, textarea } = renderForm('Original text.')

    const editor = mountGuidanceEditor(textarea)
    editor.commands.selectAll()
    editor.chain().focus().setColor('#d4351c').run()
    submit(form)

    expect(textarea.value).toBe('[Original text.]{.red}')
  })

  test('Should keep stored image paths through a hand-typed edit', () => {
    // The panes translate image paths in opposite directions; a round trip
    // through the source must still leave the stored form in the textarea.
    const { form, textarea } = renderForm('Original text.')

    mountGuidanceEditor(textarea)
    typeInSource(textarea, '![Diagram](/guidance/documents/doc-1/images/img_1.png)')
    blur(textarea)
    submit(form)

    expect(textarea.value).toContain('/guidance/documents/doc-1/images/img_1.png')
    expect(textarea.value).not.toContain('/guidance-documents/doc-1/assets/')
  })
})
