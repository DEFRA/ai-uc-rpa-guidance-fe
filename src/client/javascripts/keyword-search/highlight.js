import { matchesIn, searchTermOf } from '../../../common/keyword-matches.js'
import { keepInView } from '../guide-outline/highlight.js'

const MATCH = 'app-keyword-match'

const CURRENT_MATCH = 'app-keyword-match--current'

const SECTION_MATCH = 'app-toc__link--match'

const SECTION = 'section.app-guide-section'

// Room left between a match brought into view and the edges of what shows.
const SCROLL_MARGIN_PX = 16

// Elements that start a new line of text: words either side of one are
// apart even with no space between them in the page, and a phrase does not
// run on from one into the next.
const BLOCK_BREAK = '\u0000' // neither a space nor part of a word
const BLOCKS = 'p, li, h1, h2, h3, h4, h5, h6, td, th, dt, dd, caption, figcaption, blockquote, pre, ' +
  'section, div, ul, ol, table, tr'

/**
 * Every piece of text in an element.
 *
 * @param {Element} root
 * @returns {Text[]}
 */
function textsIn (root) {
  const walker = root.ownerDocument.createTreeWalker(root, 4) // NodeFilter.SHOW_TEXT
  const texts = []

  while (walker.nextNode()) {
    texts.push(walker.currentNode)
  }

  return texts
}

/**
 * An element's text as one string, a break between blocks, with where each
 * piece of text starts in it, so a match can cross bold or a link.
 *
 * @param {Element} root
 * @returns {{ text: string, pieces: { node: Text, start: number }[] }}
 */
function textOf (root) {
  const pieces = []
  let text = ''
  let lastBlock = null

  for (const node of textsIn(root)) {
    const block = node.parentElement.closest(BLOCKS)

    if (text && block !== lastBlock) {
      text += BLOCK_BREAK
    }
    pieces.push({ node, start: text.length })
    text += node.data
    lastBlock = block
  }

  return { text, pieces }
}

/**
 * The ids of the sections of a guide that hold the search term, in order.
 *
 * @param {Element} content The guide's content.
 * @param {string} term As searchTermOf gives it.
 * @returns {string[]}
 */
function sectionsMatching (content, term) {
  return Array.from(content.querySelectorAll(SECTION))
    .filter((section) => matchesIn(textOf(section).text, term).length)
    .map((section) => section.id)
}

/**
 * Which part of each piece of text each match covers: a match crossing bold
 * or a link covers part of several.
 *
 * @param {{ node: Text, start: number }[]} pieces
 * @param {Array<[number, number]>} matches
 * @returns {Map<Text, Array<[number, number, number]>>} For each piece of
 *   text, the [start, end) it has of each match, and that match's place.
 */
function coverOf (pieces, matches) {
  const cover = new Map()

  for (const [index, [start, end]] of matches.entries()) {
    for (const { node, start: from } of pieces) {
      const to = from + node.data.length

      if (start < to && end > from) {
        const parts = cover.get(node) ?? []
        parts.push([Math.max(start, from) - from, Math.min(end, to) - from, index])
        cover.set(node, parts)
      }
    }
  }

  return cover
}

/**
 * Wrap each match of the search term in highlights: one, or one for each
 * piece of text a match crosses.
 *
 * @param {Element} content
 * @param {string} term As searchTermOf gives it.
 * @returns {HTMLElement[][]} Each match's highlights, in the order they come.
 */
function highlight (content, term) {
  const doc = content.ownerDocument
  const { text, pieces } = textOf(content)
  const found = matchesIn(text, term)
  const matches = found.map(() => [])

  for (const [node, parts] of coverOf(pieces, found)) {
    const replacement = doc.createDocumentFragment()
    let from = 0

    for (const [start, end, index] of parts) {
      const mark = doc.createElement('mark')
      mark.className = MATCH
      mark.textContent = node.data.slice(start, end)
      replacement.append(node.data.slice(from, start), mark)
      matches[index].push(mark)
      from = end
    }

    replacement.append(node.data.slice(from))
    node.replaceWith(replacement)
  }

  return matches
}

/**
 * Take out the highlights, leaving the text as it was.
 *
 * @param {Element} content
 */
function clearHighlights (content) {
  for (const mark of content.querySelectorAll(`mark.${MATCH}`)) {
    const parent = mark.parentNode
    mark.replaceWith(mark.textContent)
    parent.normalize()
  }
}

/**
 * The outline's link to a section, or null for none.
 *
 * @param {Element | null} outline
 * @param {string | undefined} id
 * @returns {HTMLAnchorElement | null}
 */
function linkTo (outline, id) {
  const links = Array.from(outline?.querySelectorAll('a[href*="#"]') ?? [])

  return links.find((link) => decodeURIComponent(link.hash.slice(1)) === id) ?? null
}

/**
 * Highlight the outline's links to the given sections, and no others.
 *
 * @param {Element | null} outline
 * @param {string[]} ids
 */
function markSections (outline, ids) {
  for (const link of outline?.querySelectorAll('a[href*="#"]') ?? []) {
    const id = decodeURIComponent(link.hash.slice(1))
    link.classList.toggle(SECTION_MATCH, ids.includes(id))
  }
}

function counted (count, one, many) {
  return `${count} ${count === 1 ? one : many}`
}

/**
 * The whole guide's content, read from the page that shows it whole.
 *
 * @param {Document} doc
 * @returns {Promise<string>}
 */
async function fetchWholeGuide (doc) {
  const url = new URL(doc.location.href)
  url.search = '?view=whole'
  url.hash = ''

  const response = await fetch(url)

  return response.text()
}

/**
 * Bring a match into view when it is out of sight, below the search box that
 * stays at the top of the window: with its section's heading at the top, when
 * the match then shows too, so the reader sees where they are; otherwise in
 * the middle of what shows.
 *
 * @param {HTMLElement} mark
 * @param {HTMLElement} bar The search box's form, stuck to the top.
 * @param {Window} win
 */
function bringIntoView (mark, bar, win) {
  const top = bar.offsetHeight + SCROLL_MARGIN_PX
  const bottom = win.innerHeight - SCROLL_MARGIN_PX
  const box = mark.getBoundingClientRect()

  if (box.top >= top && box.bottom <= bottom) {
    return
  }

  const section = mark.closest(SECTION)
  const heading = section?.querySelector('h1, h2, h3, h4, h5, h6') ?? section
  const toHeading = heading ? heading.getBoundingClientRect().top - top : null
  const toMiddle = (box.top + box.bottom) / 2 - (top + bottom) / 2
  const headingFits = toHeading !== null && box.bottom - toHeading <= bottom

  win.scrollBy(0, headingFits ? toHeading : toMiddle)
}

/**
 * The whole guide's content, read once, from the page that shows it whole;
 * read again after a failure.
 *
 * @param {() => Promise<string>} readGuide The whole guide's page, as HTML.
 * @returns {() => Promise<Element>}
 */
function wholeGuideReader (readGuide) {
  let wholeGuide = null

  return async () => {
    wholeGuide ??= readGuide().then((html) => {
      const page = new globalThis.DOMParser().parseFromString(html, 'text/html')
      return page.querySelector('.app-guidance-content') ?? page.body
    })

    try {
      return await wholeGuide
    } catch (err) {
      wholeGuide = null
      throw err
    }
  }
}

/**
 * The section in another step to go to: the next with a match after this
 * step's sections (or, going back, the last before them), going round from
 * the end to the start (or the start to the end).
 *
 * @param {Element} guide The whole guide's content.
 * @param {Element} content This step's content.
 * @param {string[]} keywords
 * @param {boolean} back
 * @returns {string | undefined} The section's id, or none.
 */
function otherStepSection (guide, content, term, back) {
  const order = Array.from(guide.querySelectorAll(SECTION)).map((section) => section.id)
  const here = Array.from(content.querySelectorAll(SECTION)).map((section) => order.indexOf(section.id))
  const elsewhere = sectionsMatching(guide, term).filter((id) => !here.includes(order.indexOf(id)))

  return back
    ? elsewhere.findLast((id) => order.indexOf(id) < Math.min(...here)) ?? elsewhere.at(-1)
    : elsewhere.find((id) => order.indexOf(id) > Math.max(...here)) ?? elsewhere[0]
}

// For a promise left to run: a search catches its own failures (an
// unreadable whole guide), so nothing reaches here.
function handledInside () {
  // Nothing to do.
}

/**
 * One guide page's keyword search: what was searched for, its matches and
 * which is current.
 */
class KeywordSearch {
  constructor (form, { input, content, outline, fetchGuide, go }) {
    this.form = form
    this.input = input
    this.content = content
    this.outline = outline
    this.doc = form.ownerDocument
    this.win = this.doc.defaultView
    this.status = form.querySelector('[data-keyword-search-status]')
    this.stepper = outline?.dataset.module === 'guide-step-outline'
    this.wholeGuide = wholeGuideReader(fetchGuide ?? (() => fetchWholeGuide(this.doc)))
    this.open = go ?? ((url) => this.doc.location.assign(url))
    this.latest = 0
    this.searched = ''
    this.matches = []
    this.current = -1
    this.sections = []
  }

  get words () {
    return this.input.value.trim()
  }

  show (index) {
    for (const piece of this.matches[this.current] ?? []) {
      piece.classList.remove(CURRENT_MATCH)
    }
    this.current = index
    for (const piece of this.matches[index]) {
      piece.classList.add(CURRENT_MATCH)
    }
    this.reveal()

    // For the outline, which shows the reader where they are.
    this.doc.dispatchEvent(new this.win.CustomEvent('keyword-search:match'))

    const where = this.stepper ? ' in this step' : `, in ${counted(this.sections.length, 'section', 'sections')}`
    this.status.textContent = `Match ${index + 1} of ${this.matches.length}${where}`
  }

  // Bring the current match into view, and its section's link in the
  // outline, which scrolls by itself, so the link may be out of sight.
  reveal () {
    const mark = this.matches[this.current]?.[0]

    if (!mark) {
      return
    }

    bringIntoView(mark, this.form, this.win)

    const link = linkTo(this.outline, mark.closest(SECTION)?.id)
    if (link) {
      keepInView(this.outline, link)
    }
  }

  // Open the step with the next match (or, going back, the match before),
  // at that match's section, taking the search with it. False when no other
  // step has a match, or the whole guide cannot be read.
  async goToStep (term, back) {
    try {
      const target = otherStepSection(await this.wholeGuide(), this.content, term, back)
      const link = target && linkTo(this.outline, target)

      if (!link) {
        return false
      }

      const url = new URL(link.getAttribute('href'), this.doc.location.href)
      url.searchParams.set('keywords', this.words)
      url.searchParams.delete('match')
      if (back) {
        url.searchParams.set('match', 'last')
      }
      this.open(url.href)

      return true
    } catch {
      return false
    }
  }

  async markEverySection (term, searchNumber) {
    try {
      const everywhere = sectionsMatching(await this.wholeGuide(), term)

      // Unless a later search has taken over while the guide was fetched.
      if (searchNumber === this.latest) {
        markSections(this.outline, everywhere)
      }
    } catch {
      // The other steps' sections stay unmarked; this step's are shown.
    }
  }

  // A new search, starting at the first match (or, going back, the last),
  // in the section named if it has one.
  async search (term, { back = false, startAt } = {}) {
    this.latest += 1
    clearHighlights(this.content)

    this.matches = highlight(this.content, term)
    this.current = -1
    this.sections = sectionsMatching(this.content, term)
    markSections(this.outline, this.sections)

    if (!term) {
      this.status.textContent = ''
      return
    }

    if (this.stepper) {
      this.markEverySection(term, this.latest).catch(handledInside)
    }

    if (this.matches.length) {
      this.show(this.startingMatch(back, startAt))
      return
    }

    await this.lookElsewhere(term, back)
  }

  // The first match (or the last) in the section named, or in the step.
  startingMatch (back, startAt) {
    const all = this.matches.map((_mark, index) => index)
    const inSection = all.filter((index) => this.matches[index][0].closest(SECTION)?.id === startAt)
    const candidates = inSection.length ? inSection : all

    return back ? candidates.at(-1) : candidates[0]
  }

  // Nothing here: in the stepper, try the other steps.
  async lookElsewhere (term, back) {
    const none = `No matches for ${this.words}`
    this.status.textContent = this.stepper ? 'No matches in this step. Looking in the other steps.' : none

    if (this.stepper && !(await this.goToStep(term, back))) {
      this.status.textContent = none
    }
  }

  // The next match (or, going back, the one before), in another step if this
  // step has no more, or round to the first (or the last).
  async move (term, back) {
    const index = this.current + (back ? -1 : 1)

    if (index >= 0 && index < this.matches.length) {
      this.show(index)
      return
    }

    const wentOn = this.stepper && (await this.goToStep(term, back))

    if (!wentOn && this.matches.length) {
      this.show(back ? this.matches.length - 1 : 0)
    }
  }

  // The same words again move on; new words start a new search.
  async find (back) {
    const term = searchTermOf(this.input.value)

    if (term && term === this.searched) {
      await this.move(term, back)
      return
    }

    this.searched = term
    await this.search(term, { back })
  }

  // Opened with a search, as the stepper opens the step with the next match.
  async resume () {
    const term = searchTermOf(this.input.value)
    this.searched = term
    this.input.focus({ preventScroll: true })

    await this.search(term, {
      back: new URL(this.doc.location.href).searchParams.get('match') === 'last',
      startAt: decodeURIComponent(this.doc.location.hash.slice(1))
    })

    // Until the page has loaded, the browser keeps jumping to the section the
    // address names, which can leave the match below it out of sight; and a
    // jump to a section, which cannot take focus, takes it from the search
    // box, so Enter no longer moves on. Once the browser is done, bring the
    // match back and put the reader back in the box.
    if (this.doc.readyState !== 'complete') {
      this.win.addEventListener('load', () => this.win.setTimeout(() => this.settle(), 0), { once: true })
    }
  }

  settle () {
    this.input.focus({ preventScroll: true })
    this.reveal()
  }
}

/**
 * Find keywords in the guide on the page: one word as a whole word, several
 * as that whole phrase, in any case (common/keyword-matches.js, as the search
 * of every guide counts them). Submitting the search box (with the
 * Enter key) highlights each match in the guide and, in its outline, each
 * section with a match, and brings the first match into view. Submitting the
 * same search again brings the next match into view, and the first after the
 * last; Shift-Enter goes back to the one before, and the last before the
 * first.
 *
 * The stepper shows one step, so its outline also shows the sections with a
 * match in the other steps, read from the whole guide; and past the step's
 * last match (or before its first) it goes on to the step with the next match
 * (or back to the one with the match before), taking the search with it. A
 * page opened with words in the box searches for them at once, from the
 * section it opened at: from its first match, or its last when the address
 * says match=last.
 *
 * @param {HTMLFormElement | null} form The element marked
 *   data-module="keyword-search", or null for none.
 * @param {object} parts
 * @param {HTMLInputElement} parts.input The search box.
 * @param {Element} parts.content The guide's content.
 * @param {Element | null} parts.outline The guide's outline.
 * @param {() => Promise<string>} [parts.fetchGuide] The whole guide's page, as HTML.
 * @param {(url: string) => void} [parts.go] Opens another page.
 */
function findKeywords (form, parts) {
  if (!form) {
    return
  }

  const search = new KeywordSearch(form, parts)
  const doc = form.ownerDocument

  // The outline stays in view below the search box, which stays in view
  // too, so the stylesheet needs the box's height, which its status changes.
  if (globalThis.ResizeObserver) {
    new globalThis.ResizeObserver(() => {
      doc.documentElement.style.setProperty('--app-keyword-search-height', `${form.offsetHeight}px`)
    }).observe(form)
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    search.find(false).catch(handledInside)
  })

  parts.input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault()
      search.find(true).catch(handledInside)
    }
  })

  if (search.words) {
    search.resume().catch(handledInside)
  }
}

export {
  findKeywords,
  sectionsMatching
}
