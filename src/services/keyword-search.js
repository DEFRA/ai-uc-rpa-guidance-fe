import { matchesIn, searchTermOf } from '../common/keyword-matches.js'
import * as guidanceApi from '../infra/api/guidance-api.js'
import { listPrototypeGuides } from './prototype-guides.js'

// Characters Markdown marks text up with, left out of a result's sentence.
const MARKUP = new Set(['#', '*', '_', '`', '>', '[', ']', '|', '\\'])

// What ends a sentence, when a space or the end of the line follows.
const SENTENCE_ENDS = new Set(['.', '?', '!'])

// The longest sentence shown whole; a longer one is cut around its match.
const LONGEST_SENTENCE = 300
const SENTENCE_REACH = 120

/**
 * A line of Markdown as plain text, with its spaces closed up.
 *
 * @param {string} line
 * @returns {string}
 */
function plainText (line) {
  const kept = [...line].filter((character) => !MARKUP.has(character)).join('')

  return kept.trim().split(/\s+/).filter(Boolean).join(' ')
}

/**
 * A section's lines of text, each marked as a heading or not.
 *
 * @param {string} markdown
 * @returns {{ text: string, heading: boolean }[]}
 */
function linesOf (markdown) {
  return markdown.split('\n')
    .map((line) => ({ text: plainText(line), heading: line.trimStart().startsWith('#') }))
    .filter((line) => line.text)
}

/**
 * A line's sentences, each with what ends it.
 *
 * @param {string} text
 * @returns {string[]}
 */
function sentencesOf (text) {
  const sentences = []
  let from = 0

  for (let at = 0; at < text.length; at += 1) {
    if (SENTENCE_ENDS.has(text[at]) && (at + 1 === text.length || text[at + 1] === ' ')) {
      sentences.push(text.slice(from, at + 1).trim())
      from = at + 1
    }
  }

  const rest = text.slice(from).trim()
  return rest ? [...sentences, rest] : sentences
}

/**
 * A long sentence cut, at words, to the text around its first match.
 *
 * @param {string} sentence
 * @param {number} first Where the first match starts.
 * @returns {string}
 */
function around (sentence, first) {
  if (sentence.length <= LONGEST_SENTENCE) {
    return sentence
  }

  const start = Math.max(first - SENTENCE_REACH, 0)
  const end = Math.min(first + SENTENCE_REACH, sentence.length)
  const from = start === 0 ? 0 : sentence.indexOf(' ', start) + 1
  const to = end === sentence.length ? end : sentence.lastIndexOf(' ', end)

  return `${from > 0 ? '…' : ''}${sentence.slice(from, to)}${to < sentence.length ? '…' : ''}`
}

/**
 * A sentence in parts, its matches marked.
 *
 * @param {string} sentence
 * @param {string} term
 * @returns {{ text: string, match: boolean }[]}
 */
function partsOf (sentence, term) {
  const parts = []
  let from = 0

  for (const [start, end] of matchesIn(sentence, term)) {
    parts.push({ text: sentence.slice(from, start), match: false }, { text: sentence.slice(start, end), match: true })
    from = end
  }
  parts.push({ text: sentence.slice(from), match: false })

  return parts.filter((part) => part.text)
}

/**
 * The first sentence of a section's text holding a match, or of its heading
 * when only the heading holds one, its matches marked.
 *
 * @param {{ text: string, heading: boolean }[]} lines
 * @param {string} term
 * @returns {{ text: string, match: boolean }[]}
 */
function snippetOf (lines, term) {
  const inOrder = [...lines.filter((line) => !line.heading), ...lines.filter((line) => line.heading)]
  const sentence = inOrder.flatMap((line) => sentencesOf(line.text))
    .find((candidate) => matchesIn(candidate, term).length)
  const shown = around(sentence, matchesIn(sentence, term)[0][0])

  return partsOf(shown, term)
}

/**
 * One guide's sections holding the search term, with how many times.
 *
 * @param {object} guide A manifest entry.
 * @param {string} term
 * @returns {Promise<object[]>} None when its sections cannot be read.
 */
async function matchingSectionsOf (guide, term) {
  const res = await guidanceApi.getPrototypeGuideSections(guide.documentId)

  if (!res.ok) {
    return []
  }

  return res.data.sections
    .map((section) => ({ section, lines: linesOf(section.markdown) }))
    .map(({ section, lines }) => ({
      section,
      lines,
      // Line by line: a phrase does not run on from one line into the next.
      matches: lines.reduce((count, line) => count + matchesIn(line.text, term).length, 0)
    }))
    .filter(({ matches }) => matches > 0)
    .map(({ section, lines, matches }) => ({
      documentId: guide.documentId,
      documentTitle: guide.title,
      sectionNumber: section.number,
      heading: section.heading,
      matches,
      snippet: snippetOf(lines, term)
    }))
}

/**
 * Every section of every guide holding a search's words (one as a whole
 * word, several as a whole phrase), the most matches first, then in the
 * order of the guides and their sections.
 *
 * @param {string} query
 * @returns {Promise<object[]>}
 */
async function searchGuideSections (query) {
  const term = searchTermOf(query)

  if (!term) {
    return []
  }

  const guides = await listPrototypeGuides()
  const found = await Promise.all(guides.map((guide) => matchingSectionsOf(guide, term)))

  return found.flat().sort((a, b) => b.matches - a.matches)
}

export {
  searchGuideSections
}
