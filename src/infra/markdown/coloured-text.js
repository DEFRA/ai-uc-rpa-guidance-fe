import { COLOURED_SPAN, colourClass } from './text-colours.js'

/**
 * A `marked` extension that renders the editor's coloured spans.
 *
 * `[text]{.red}` is not Markdown that `marked` knows, so without this the
 * brackets and braces would reach the reader as literal punctuation -- the same
 * way `==highlight==` does today. The span is emitted with a class and no inline
 * style, which is the only form sanitise.js keeps.
 *
 * @returns {object} A `marked` extension.
 */
function colouredText () {
  return {
    extensions: [
      {
        name: 'colouredText',
        level: 'inline',
        start: (src) => src.indexOf('['),
        tokenizer (src) {
          const match = COLOURED_SPAN.exec(src)

          if (!match) {
            return undefined
          }

          const [raw, text, modifier] = match

          // A class we do not recognise is not ours to render; declining lets
          // marked fall back to its own rules and leave the text as written.
          if (!colourClass(modifier)) {
            return undefined
          }

          return {
            type: 'colouredText',
            raw,
            modifier,
            tokens: this.lexer.inlineTokens(text)
          }
        },
        renderer (token) {
          const content = this.parser.parseInline(token.tokens)

          return `<span class="${colourClass(token.modifier)}">${content}</span>`
        }
      }
    ]
  }
}

export { colouredText }
