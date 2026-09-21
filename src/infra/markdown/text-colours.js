/**
 * @fileoverview The editor's colour palette and the Markdown syntax that carries
 * it, shared by the two ends of the round trip.
 *
 * Markdown has no syntax for colour, so a coloured run is written as a
 * Pandoc-style bracketed span -- `[text]{.red}` -- the form Tiptap's own
 * `parseAttributes` helper documents. Only the modifier in the braces is
 * stored: the editor maps it to a hex to colour the mark, and the renderer maps
 * it to a class to colour the page. Both do that here, so the two cannot drift
 * apart, and neither a hex nor a class name is ever baked into guidance files.
 */

const TEXT_COLOURS = [
  { command: 'colorRed', hex: '#d4351c', name: 'Red text', modifier: 'red' },
  { command: 'colorBlue', hex: '#1d70b8', name: 'Blue text', modifier: 'blue' },
  { command: 'colorGreen', hex: '#00703c', name: 'Green text', modifier: 'green' },
  { command: 'colorBlack', hex: '#0b0c0c', name: 'Black text', modifier: 'black' }
]

// Anchored: both tokenizers are handed the remaining source and must only claim a
// span that starts exactly where they are looking.
//
// The inner text allows an escaped character, which a naive `[^\]]+` does not. That
// matters more than it sounds: a converted document escapes the brackets an author
// typed, so `[SBI]` in red arrives as `[\[SBI\]]{.red}`, and a class stopping at the
// first `]` would decline the span and drop the colour on every placeholder written
// that way. Escaping is not the problem -- an unescaped `[[SBI]]{.red}` fails the
// same way -- so the alternation is what has to be here.
//
// A link inside a coloured run is still out of scope: its `](` would need balanced
// matching rather than one more alternative. Nothing produces one, because Word
// paints its own colour on every hyperlink and the parser drops it.
const COLOURED_SPAN = /^\[((?:\\.|[^\]\\])+)\]\{\.([a-z]+)\}/

const CLASS_PREFIX = 'app-editor__text--'

const HEX_BY_MODIFIER = new Map(
  TEXT_COLOURS.map(({ hex, modifier }) => [modifier, hex])
)

const MODIFIER_BY_HEX = new Map(
  TEXT_COLOURS.map(({ hex, modifier }) => [hex, modifier])
)

/**
 * The modifier that names a colour, or null if it is not one of ours.
 *
 * @param {string} hex
 * @returns {string|null}
 */
function colourModifier (hex) {
  return MODIFIER_BY_HEX.get(hex) ?? null
}

/**
 * The colour a modifier names, or null if it is not one of ours.
 *
 * @param {string} modifier
 * @returns {string|null}
 */
function colourHex (modifier) {
  return HEX_BY_MODIFIER.get(modifier) ?? null
}

/**
 * The CSS class that paints a modifier, or null if it is not one of ours.
 *
 * Returning null is what lets both tokenizers decline a span they do not
 * recognise, leaving `[text]{.anything-else}` as the literal text it is.
 *
 * @param {string} modifier
 * @returns {string|null}
 */
function colourClass (modifier) {
  return HEX_BY_MODIFIER.has(modifier) ? `${CLASS_PREFIX}${modifier}` : null
}

export { COLOURED_SPAN, TEXT_COLOURS, colourClass, colourHex, colourModifier }
