import { Marked } from 'marked'

/**
 * Create a fluent, extensible Markdown rendering pipeline.
 *
 * Each `use(extension)` registers a `marked` extension (e.g. a renderer
 * override or a `walkTokens` transform), so new behaviour can be composed
 * without changing the renderer itself:
 *
 *   const html = createMarkdown()
 *     .use(govukRenderer())
 *     .use(rewriteIntraDocLinks({ documentId, sections }))
 *     .render(markdown)
 *
 * @returns {{ use: (extension: object) => any, render: (markdown: string) => string }}
 */
function createMarkdown () {
  const marked = new Marked()

  const api = {
    use (extension) {
      marked.use(extension)
      return api
    },
    render (markdown) {
      return marked.parse(markdown ?? '', { async: false })
    }
  }

  return api
}

export { createMarkdown }
