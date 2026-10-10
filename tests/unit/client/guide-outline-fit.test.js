// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest'

import { fitOutlineToWindow } from '../../../src/client/javascripts/guide-outline/highlight.js'

// jsdom lays nothing out, so the outline says where its top is.
let top = 0

function render (position = 'sticky') {
  document.body.innerHTML = '<nav data-module="guide-step-outline"></nav>'
  const outline = document.querySelector('nav')
  outline.style.position = position
  outline.getBoundingClientRect = () => ({ top })
  return outline
}

describe('#fitOutlineToWindow', () => {
  let stop

  beforeEach(() => {
    window.innerHeight = 800
    top = 250
  })

  afterEach(() => {
    stop?.()
  })

  test('Should end the outline above the bottom of the window, below the page header', () => {
    const outline = render()

    stop = fitOutlineToWindow(outline, window)

    expect(outline.style.maxHeight).toBe(`${800 - 250 - 16}px`)
  })

  test('Should grow the outline as the page scrolls it up to the top of the window', () => {
    const outline = render()
    stop = fitOutlineToWindow(outline, window)

    top = 15
    window.dispatchEvent(new window.Event('scroll'))

    expect(outline.style.maxHeight).toBe(`${800 - 15 - 16}px`)
  })

  test('Should leave an outline that does not stay in view, on a narrow screen, its full height', () => {
    const outline = render('static')

    stop = fitOutlineToWindow(outline, window)

    expect(outline.style.maxHeight).toBe('')
  })

  test('Should do nothing on a page without an outline', () => {
    expect(() => fitOutlineToWindow(null, window)()).not.toThrow()
  })
})
