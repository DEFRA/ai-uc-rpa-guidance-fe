#!/usr/bin/env node
/**
 * Normalise guidance Markdown to the editor's flavour.
 *
 * Reads Markdown on stdin and writes it back on stdout, having passed it through
 * the same parse/serialise round trip the whole-document edit form performs when
 * it is submitted (see `src/client/javascripts/guidance-editor/mount.js`):
 *
 *   markdown -> new Editor({ contentType: 'markdown' }) -> editor.getMarkdown()
 *
 * The point is fidelity, not quality. The round trip is lossy on Word-derived
 * guidance -- see DECISION_LOG.md D5 -- and this script deliberately reproduces
 * that damage rather than repairing it, so that its output can be trusted as
 * evidence of what the application would really store. Do not "fix" the Markdown
 * here; fix the application.
 *
 * Usage:
 *   node scripts/normalise-markdown.js < content.md > normalised.md
 *
 * Run it from the repository root so that bare specifiers resolve against this
 * repository's node_modules -- the @tiptap version is pinned there, and the
 * output is only meaningful when produced by the same serialiser the browser
 * loads.
 */

import { JSDOM } from 'jsdom'

// The editor is browser code, so a DOM has to exist before @tiptap is imported.
// This is not merely cosmetic: MarkdownManager.parseHTMLToken checks for
// window.DOMParser and, when it is absent, keeps recognised HTML as literal text
// instead of parsing it (see @tiptap/markdown MarkdownManager.ts). Guidance
// Markdown expresses *all* inline formatting as raw <strong>/<em>/<u>, so
// without a DOM this script would silently disagree with the browser about
// nearly every formatted run in the document.
function installDomGlobals () {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    pretendToBeVisual: true
  })

  const globals = [
    'document', 'navigator', 'DOMParser', 'Node', 'Element', 'HTMLElement',
    'Text', 'DocumentFragment', 'MutationObserver', 'getComputedStyle', 'Range'
  ]

  // defineProperty rather than assignment: Node 24 exposes `navigator` as a
  // getter-only global, and `globalThis.navigator = ...` throws on it.
  const define = (name, value) =>
    Object.defineProperty(globalThis, name, {
      value,
      writable: true,
      configurable: true
    })

  define('window', dom.window)
  for (const name of globals) {
    define(name, dom.window[name])
  }

  // jsdom implements no layout, so ProseMirror throws when it measures a
  // non-empty selection to scroll it into view. Reporting no rectangles is
  // enough: the editor then has nothing to scroll to. Same shims as
  // tests/unit/client/guidance-editor.test.js.
  globalThis.Range.prototype.getClientRects ??= () => []
  globalThis.Range.prototype.getBoundingClientRect ??= () => ({
    top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, x: 0, y: 0
  })
}

/**
 * Read all of stdin as UTF-8.
 *
 * @returns {Promise<string>}
 */
async function readStdin () {
  const chunks = []

  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks).toString('utf8')
}

/**
 * Round-trip a whole document through the editor.
 *
 * The title is held out of the round trip because the edit page holds it out
 * too: it is a separate form field, and only the body below it is given to the
 * editor. Passing it through would subject the title to escaping rules that a
 * real save never applies to it.
 *
 * Image paths are left alone. toBrowserImagePaths/toStoredImagePaths only
 * rewrite the `/guidance/documents/{id}/images/` prefix that the backend serves,
 * and locally-written images do not use it, so the pair would be a no-op on both
 * sides -- calling it would mean inventing a document id to no effect.
 *
 * @param {string} markdown A whole document, title line included.
 * @returns {Promise<string>}
 */
async function normalise (markdown) {
  const { splitDocumentMarkdown } = await import(
    '../src/infra/markdown/section-heading.js'
  )
  const { EXTENSION_VARIANTS } = await import(
    '../src/client/javascripts/guidance-editor/extensions.js'
  )
  const { Editor } = await import('@tiptap/core')

  const { title, body } = splitDocumentMarkdown(markdown)

  const editor = new Editor({
    element: document.createElement('div'),
    extensions: EXTENSION_VARIANTS.document,
    content: body,
    contentType: 'markdown'
  })

  const normalisedBody = editor.getMarkdown()

  editor.destroy()

  // A document with no heading line has no title to put back; anything else is
  // recomposed exactly as the parser's renderer writes it.
  return title === null
    ? `${normalisedBody}\n`
    : `# ${title}\n\n${normalisedBody}\n`
}

async function main () {
  installDomGlobals()

  const input = await readStdin()

  if (!input.trim()) {
    process.stderr.write('normalise-markdown: no input on stdin\n')
    process.exitCode = 2
    return
  }

  process.stdout.write(await normalise(input))
}

main().catch((error) => {
  process.stderr.write(`normalise-markdown: ${error.stack ?? error}\n`)
  process.exitCode = 1
})
