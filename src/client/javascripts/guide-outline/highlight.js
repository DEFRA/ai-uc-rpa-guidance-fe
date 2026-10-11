// How far down the window a section's heading must come to be the one being
// read: a quarter, so a short section's successor peeking in below it does
// not take over.
const READING_LINE = 0.25

const CURRENT = 'app-toc__link--current'

// Room left above a step's first link when the outline scrolls to it.
const SCROLL_MARGIN_PX = 16

/**
 * Keep a guide's outline in step with the reader of the whole guide: the
 * section whose heading was last scrolled past is highlighted, and said to be
 * the reader's location, until the next one arrives.
 *
 * @param {HTMLElement | null} outline The element marked
 *   data-module="guide-outline", or null for none.
 * @param {Window} [win]
 * @returns {() => void} Stops following the scroll.
 */
function highlightSectionInView (outline, win = globalThis.window) {
  if (!outline) {
    return () => {}
  }

  const entries = Array.from(outline.querySelectorAll('a[href^="#"]'))
    .map((link) => ({ link, section: outline.ownerDocument.getElementById(decodeURIComponent(link.hash.slice(1))) }))
    .filter((entry) => entry.section)

  let current = null

  const show = (entry) => {
    if (current) {
      current.link.classList.remove(CURRENT)
      current.link.removeAttribute('aria-current')
    }

    current = entry
    current.link.classList.add(CURRENT)
    current.link.setAttribute('aria-current', 'location')
    keepInView(outline, current.link)
  }

  const update = () => {
    const line = win.innerHeight * READING_LINE
    let reading = entries[0]

    for (const entry of entries) {
      if (entry.section.getBoundingClientRect().top > line) {
        break
      }
      reading = entry
    }

    if (reading && reading !== current) {
      show(reading)
    }
  }

  win.addEventListener('scroll', update, { passive: true })
  win.addEventListener('resize', update)
  update()

  return () => {
    win.removeEventListener('scroll', update)
    win.removeEventListener('resize', update)
  }
}

/**
 * Keep a guide's outline panel no taller than the window has room for, so it
 * ends on screen and its own scroll can reach every link. The stylesheet's
 * limit assumes the panel is already stuck to the top of the window; until the
 * reader scrolls, it starts lower, below the page's header, and would run on
 * past the bottom of the window.
 *
 * Only while the outline stays in view (position: sticky, on wider screens):
 * otherwise it sits above the guide at its full height.
 *
 * @param {HTMLElement | null} outline
 * @param {Window} [win]
 * @returns {() => void} Stops fitting it.
 */
function fitOutlineToWindow (outline, win = globalThis.window) {
  if (!outline) {
    return () => {}
  }

  const fit = () => {
    const sticky = win.getComputedStyle(outline).position === 'sticky'
    const top = Math.max(outline.getBoundingClientRect().top, 0)

    outline.style.maxHeight = sticky ? `${win.innerHeight - top - SCROLL_MARGIN_PX}px` : ''
  }

  win.addEventListener('scroll', fit, { passive: true })
  win.addEventListener('resize', fit)
  fit()

  return () => {
    win.removeEventListener('scroll', fit)
    win.removeEventListener('resize', fit)
  }
}

/**
 * In the stepper, scroll a guide's outline so the step being read, whose links
 * the server marked current, is on screen: just far enough to show all of the
 * step's links, or, for a step too long for that, its first link near the top.
 *
 * On screen, not just inside the panel: until the reader scrolls, the panel
 * starts below the page's header and runs on past the bottom of the window.
 *
 * @param {HTMLElement | null} outline The element marked
 *   data-module="guide-step-outline", or null for none.
 * @param {Window} [win]
 */
function revealCurrentStep (outline, win = globalThis.window) {
  const links = outline ? Array.from(outline.querySelectorAll(`.${CURRENT}`)) : []

  if (!links.length) {
    return
  }

  const box = outline.getBoundingClientRect()
  const top = Math.max(box.top, 0)
  const bottom = Math.min(box.bottom, win.innerHeight)
  const first = links[0].getBoundingClientRect()
  const last = links.at(-1).getBoundingClientRect()

  // How far brings the first link to the top, and how far the last to the bottom.
  const toFirst = first.top - top - SCROLL_MARGIN_PX
  const toLast = last.bottom + SCROLL_MARGIN_PX - bottom

  // Back up to the first link when it is above; otherwise down only as far as
  // shows the last, never past the first, and not at all when both show.
  outline.scrollTop += first.top < top ? toFirst : Math.max(Math.min(toLast, toFirst), 0)
}

/**
 * Scroll the outline, not the page, so the highlighted link stays in it.
 *
 * @param {HTMLElement} outline
 * @param {HTMLElement} link
 */
function keepInView (outline, link) {
  const box = outline.getBoundingClientRect()
  const rect = link.getBoundingClientRect()

  // Up by as much as the link is above the outline, or down by as much as it
  // is below; nothing when it is inside.
  const above = Math.min(rect.top - box.top, 0)
  const below = Math.max(rect.bottom - box.bottom, 0)

  outline.scrollTop += above || below
}

export {
  fitOutlineToWindow,
  highlightSectionInView,
  revealCurrentStep
}
