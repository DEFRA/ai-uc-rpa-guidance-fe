import { Highlight } from '@tiptap/extension-highlight'
import { Image } from '@tiptap/extension-image'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { Color, TextStyle } from '@tiptap/extension-text-style'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'

// The extension list is the Markdown flavour: what the schema does not model is
// dropped on save, and each extension's `renderMarkdown` decides the syntax that
// comes back out. It lives here, apart from the toolbar, so that anything needing
// to reproduce a save — the editor in the browser, or a script running the same
// round trip headlessly — shares one definition and cannot drift from the other.

// Colour is display-only. Markdown has no syntax for it, so it never survives
// getMarkdown(); it is wired up for the proof of concept knowing that.
const TEXT_COLOURS = [
  { command: 'colorRed', hex: '#d4351c', name: 'Red text', modifier: 'red' },
  { command: 'colorBlue', hex: '#1d70b8', name: 'Blue text', modifier: 'blue' },
  { command: 'colorGreen', hex: '#00703c', name: 'Green text', modifier: 'green' },
  { command: 'colorBlack', hex: '#0b0c0c', name: 'Black text', modifier: 'black' }
]

const COLOUR_CLASS_BY_HEX = new Map(
  TEXT_COLOURS.map(({ hex, modifier }) => [hex, `app-editor__text--${modifier}`])
)

// The colour mark carries a class as well as the library's inline style.
// `style-src` is `'self'` with a nonce and no `'unsafe-inline'`, and a nonce
// cannot apply to a style *attribute*, so a browser enforcing style-src-attr
// (which falls back to style-src) would drop the inline declaration. The class
// keeps the colour visible either way, and is also the form the read path would
// accept: sanitise.js allows a span's class but not its style.
const ClassColor = Color.extend({
  addGlobalAttributes () {
    return [
      {
        types: this.options.types,
        attributes: {
          color: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute('data-colour') ?? element.style.color ?? null,
            renderHTML: (attributes) => {
              if (!attributes.color) {
                return {}
              }

              const className = COLOUR_CLASS_BY_HEX.get(attributes.color)

              return {
                'data-colour': attributes.color,
                // Kept so TextStyle's own parseHTML still recognises the span,
                // which keys off the presence of a style attribute.
                style: `color: ${attributes.color}`,
                ...(className ? { class: className } : {})
              }
            }
          }
        }
      }
    ]
  }
})

// Underline is deliberately off: its serialiser emits `++text++`, which is not
// Markdown, so `marked` would render the plus signs literally to readers.
const BASE_EXTENSIONS = [
  StarterKit.configure({ underline: false }),
  Image,
  Table,
  TableRow,
  TableCell,
  TableHeader,
  Markdown
]

const COLOUR_EXTENSIONS = [TextStyle, ClassColor, Highlight]

// The section editor keeps exactly the extensions it shipped with: loading the
// colour marks there would let an editor apply a colour that the save path then
// silently discards.
const EXTENSION_VARIANTS = {
  section: BASE_EXTENSIONS,
  document: [...BASE_EXTENSIONS, ...COLOUR_EXTENSIONS]
}

export { BASE_EXTENSIONS, COLOUR_EXTENSIONS, EXTENSION_VARIANTS, TEXT_COLOURS }
