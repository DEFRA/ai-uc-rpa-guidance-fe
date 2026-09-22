// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from 'vitest'

import { mountGuidanceViewer } from '../../../src/client/javascripts/guidance-viewer/mount.js'

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

function renderSection (markdown) {
  document.body.innerHTML = `
    <div class="app-guidance-content" data-module="guidance-viewer">
      <textarea data-guidance-markdown hidden></textarea>
      <p class="govuk-body">Rendered by the server.</p>
    </div>
  `
  const container = document.querySelector('[data-module="guidance-viewer"]')
  container.querySelector('[data-guidance-markdown]').value = markdown

  return { container, editor: mountGuidanceViewer(container) }
}

describe('#mountGuidanceViewer', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  test('Should replace the server rendering with the editor’s own', () => {
    const { container } = renderSection('## 1 Overview\n\nSome body text.')

    expect(container.textContent).not.toContain('Rendered by the server.')
    expect(container.querySelector('.ProseMirror h2').textContent).toBe('1 Overview')
    expect(container.querySelector('.ProseMirror p').textContent).toBe('Some body text.')
  })

  test('Should leave the server rendering in place with no Markdown to show', () => {
    document.body.innerHTML = '<div data-module="guidance-viewer"><p>Rendered by the server.</p></div>'
    const container = document.querySelector('[data-module="guidance-viewer"]')

    expect(mountGuidanceViewer(container)).toBeNull()
    expect(container.textContent).toContain('Rendered by the server.')
  })

  test('Should not let the reader edit what they are reading', () => {
    const { container, editor } = renderSection('Some body text.')

    expect(editor.isEditable).toBe(false)
    expect(
      container.querySelector('.ProseMirror').getAttribute('contenteditable')
    ).toBe('false')
  })

  describe('tables', () => {
    const TABLE = [
      '| Case name | Action to take |',
      '| --- | --- |',
      '| CS Agreement | Continue to the guide. |'
    ].join('\n')

    test('Should render a pipe table as a table', () => {
      const { container } = renderSection(TABLE)

      const headers = [...container.querySelectorAll('.ProseMirror th')]
      const cells = [...container.querySelectorAll('.ProseMirror td')]

      expect(headers.map((cell) => cell.textContent)).toEqual([
        'Case name',
        'Action to take'
      ])
      expect(cells.map((cell) => cell.textContent)).toEqual([
        'CS Agreement',
        'Continue to the guide.'
      ])
    })

    test('Should show a cell’s bulleted lines as a list', () => {
      // How the converter writes a cell holding a list: a pipe row is one line,
      // so the items arrive separated by <br>. Read back as a paragraph wearing
      // hyphens they would be a list nobody could edit. See `tables.js`.
      const { container } = renderSection(
        '| Checks |\n| --- |\n| - one<br>- two |'
      )

      const items = [...container.querySelectorAll('.ProseMirror td li')]

      expect(items.map((item) => item.textContent)).toEqual(['one', 'two'])
    })

    test('Should keep the blocks of a multi-block cell apart', () => {
      const { container } = renderSection(
        '| Action |\n| --- |\n| Do this:<br>- one<br>- two |'
      )

      const cell = container.querySelector('.ProseMirror td')

      expect(cell.querySelector('p').textContent).toBe('Do this:')
      expect([...cell.querySelectorAll('li')].map((i) => i.textContent)).toEqual([
        'one',
        'two'
      ])
    })
  })

  describe('links', () => {
    test('Should keep a link to another section in this tab', () => {
      const { container } = renderSection('See [Annex A](/guidance-documents/doc-1/sections/7).')

      const anchor = container.querySelector('.ProseMirror a')

      expect(anchor.getAttribute('href')).toBe('/guidance-documents/doc-1/sections/7')
      expect(anchor.getAttribute('target')).toBeNull()
    })

    test('Should open a link that leaves the service in a new tab', () => {
      const { container } = renderSection('See [the guide](https://gov.uk/guide).')

      const anchor = container.querySelector('.ProseMirror a')

      expect(anchor.getAttribute('target')).toBe('_blank')
      expect(anchor.getAttribute('rel')).toContain('noopener')
    })
  })

  test('Should show an image from the path this application serves it on', () => {
    const { container } = renderSection(
      '![A screen](/guidance-documents/doc-1/assets/3.1_img_1.png)'
    )

    const image = container.querySelector('.ProseMirror img')

    expect(image.getAttribute('src')).toBe(
      '/guidance-documents/doc-1/assets/3.1_img_1.png'
    )
    expect(image.getAttribute('alt')).toBe('A screen')
  })

  test('Should show a callout box as a quote, with its red text red', () => {
    // How a Word callout arrives: the parser has no Markdown for a box, so a
    // one-cell table becomes a blockquote, and the red an author used to mark
    // the parts to fill in becomes a bracketed span.
    const { container } = renderSection(
      [
        '> Version of the guide used:[&lt;input the version number&gt;]{.red}',
        '>',
        '> TEXT: Case put on hold.',
        '>',
        '> [&lt;Name and date&gt;]{.red}'
      ].join('\n')
    )

    const quote = container.querySelector('.ProseMirror blockquote')
    const red = [...quote.querySelectorAll('span.app-editor__text--red')]

    // Three paragraphs, not one run-on: a callout says several things.
    expect(quote.querySelectorAll('p')).toHaveLength(3)
    expect(red.map((span) => span.textContent)).toEqual([
      '<input the version number>',
      '<Name and date>'
    ])
  })

  test('Should paint a coloured run by class, as the editor does', () => {
    const { container } = renderSection('A [warning]{.red} here.')

    const span = container.querySelector('.ProseMirror span.app-editor__text--red')

    expect(span.textContent).toBe('warning')
  })

  test('Should not build an element out of HTML smuggled into the Markdown', () => {
    const { container } = renderSection(
      'Before.<script>alert(1)</script>After.\n\n<img src="x" onerror="alert(1)">'
    )

    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('[onerror]')).toBeNull()
    expect(container.textContent).toContain('Before.')
    expect(container.textContent).toContain('After.')
  })
})
