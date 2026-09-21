import { Highlight } from '@tiptap/extension-highlight'
import { Image } from '@tiptap/extension-image'
import { TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'

import { TEXT_COLOURS } from '../../../infra/markdown/text-colours.js'
import { ClassColor, MarkdownTextStyle } from './coloured-text.js'
import { GuidanceLink } from './links.js'
import { FaithfulTable } from './tables.js'

// The extension list is the schema, and the schema is the Markdown flavour: what
// it cannot model is dropped as a document is read in, and each extension's
// `renderMarkdown` decides the syntax that comes back out. So a construct missing
// from the page is as likely to be absent from this list as it is to be missing
// from the parser's Markdown -- check here first.
//
// It lives apart from the toolbar and apart from any one screen, so that the
// editor, the read-only viewer and a script running the same round trip headlessly
// all share one definition and cannot drift from each other.

// Underline is deliberately off: its serialiser emits `++text++`, which is not
// Markdown, so a reader's renderer would show the plus signs literally. The visible
// consequence is that `<u>` runs in a converted document read as plain text.
const EXTENSIONS = [
  // The stock link mark opens every link in a new tab, including a
  // cross-reference to another section of the same guide. See `links.js`.
  StarterKit.configure({ underline: false, link: false }),
  GuidanceLink,
  Image,
  // The stock Table pads its Markdown with a blank line at each end, welds the
  // blocks of a multi-block cell together, and reads a cell's list back as a
  // paragraph wearing hyphens. See `tables.js`.
  FaithfulTable,
  TableRow,
  TableCell,
  TableHeader,
  Markdown,
  // Colour has no Markdown syntax of its own, so it is carried as a bracketed span
  // -- `[text]{.red}` -- which these two halves define between them: the mark owns
  // the Markdown, and the Color variant owns what the browser paints. The stock
  // pair loses a coloured run on the first save and could not render it under this
  // application's CSP anyway. See `coloured-text.js`.
  MarkdownTextStyle,
  ClassColor,
  Highlight
]

export { EXTENSIONS, TEXT_COLOURS }
