// @vitest-environment jsdom
import { beforeEach, describe, test, expect } from 'vitest'

import { revealCurrentStep } from '../../../src/client/javascripts/guide-outline/highlight.js'

// jsdom lays nothing out and does not scroll, so the outline and its links
// say where they are, and the outline's scroll is a plain number.
function render ({ outlineTop = 0, outlineBottom = 600, linkTops }) {
  document.body.innerHTML = `
    <nav data-module="guide-step-outline">
      <a class="app-toc__link" href="?view=steps&step=1#section-1">1 Background</a>
      <a class="app-toc__link app-toc__link--current" href="#section-9">9 Requesting evidence</a>
      <a class="app-toc__link app-toc__link--current" href="#section-9.1">9.1 Contact</a>
    </nav>
  `
  const outline = document.querySelector('nav')
  let scrollTop = 0
  Object.defineProperty(outline, 'scrollTop', { get: () => scrollTop, set: (value) => { scrollTop = value } })
  outline.getBoundingClientRect = () => ({ top: outlineTop, bottom: outlineBottom })
  outline.querySelectorAll('a').forEach((link, index) => {
    link.getBoundingClientRect = () => ({ top: linkTops[index], bottom: linkTops[index] + 30 })
  })
  return outline
}

describe('#revealCurrentStep', () => {
  // The panel starts below the page's header, so its bottom is past the fold
  // until the reader scrolls: only up to the window's bottom is on screen.
  const panel = { outlineTop: 250, outlineBottom: 1000 }

  beforeEach(() => {
    window.innerHeight = 800
  })

  test('Should scroll just enough to show every one of the step\'s sections on screen', () => {
    const outline = render({ ...panel, linkTops: [300, 900, 940] })

    revealCurrentStep(outline)

    // The last link's bottom (970) to 16px above the window's bottom (800).
    expect(outline.scrollTop).toBe(970 + 16 - 800)
  })

  test('Should keep the step\'s first section on screen when the step is too long to show it all', () => {
    const outline = render({ ...panel, linkTops: [300, 600, 1400] })

    revealCurrentStep(outline)

    // The first link to 16px below the panel's top, and no further.
    expect(outline.scrollTop).toBe(600 - 250 - 16)
  })

  test('Should leave the outline where it is when the step\'s sections are on screen', () => {
    const outline = render({ ...panel, linkTops: [300, 500, 540] })

    revealCurrentStep(outline)

    expect(outline.scrollTop).toBe(0)
  })

  test('Should scroll back up to a step above the part in view', () => {
    const outline = render({ ...panel, linkTops: [-900, -400, -360] })
    outline.scrollTop = 1000

    revealCurrentStep(outline)

    expect(outline.scrollTop).toBe(1000 + (-400 - 250 - 16))
  })

  test('Should do nothing on a page without a step outline', () => {
    expect(() => revealCurrentStep(null)).not.toThrow()
  })
})
