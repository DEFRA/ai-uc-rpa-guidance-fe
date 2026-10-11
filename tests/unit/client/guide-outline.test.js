// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest'

import { highlightSectionInView } from '../../../src/client/javascripts/guide-outline/highlight.js'

// jsdom lays nothing out, so each section says where its top is.
const tops = {}

function render () {
  document.body.innerHTML = `
    <nav data-module="guide-outline">
      <a class="app-toc__link" href="#section-1">1 Background</a>
      <a class="app-toc__link" href="#section-1.1">1.1 Scope</a>
      <a class="app-toc__link" href="#section-2">2 Checking</a>
    </nav>
    <section id="section-1"></section>
    <section id="section-1.1"></section>
    <section id="section-2"></section>
  `
  document.querySelectorAll('section').forEach((section) => {
    section.getBoundingClientRect = () => ({ top: tops[section.id] })
  })
  return document.querySelector('[data-module="guide-outline"]')
}

function scrollTo (newTops) {
  Object.assign(tops, newTops)
  window.dispatchEvent(new window.Event('scroll'))
}

const current = () => Array.from(document.querySelectorAll('.app-toc__link--current'))
  .map((link) => link.getAttribute('href'))

describe('#highlightSectionInView', () => {
  let stop

  beforeEach(() => {
    window.innerHeight = 800
    Object.assign(tops, { 'section-1': 100, 'section-1.1': 900, 'section-2': 1800 })
  })

  afterEach(() => {
    stop?.()
  })

  test('Should highlight the section in view when the page opens', () => {
    stop = highlightSectionInView(render(), window)

    expect(current()).toEqual(['#section-1'])
  })

  test('Should highlight the last section whose heading has reached the top quarter of the window', () => {
    stop = highlightSectionInView(render(), window)

    scrollTo({ 'section-1': -1000, 'section-1.1': 150, 'section-2': 1000 })

    expect(current()).toEqual(['#section-1.1'])
  })

  test('Should say which link is the reader\'s location, on that link only', () => {
    stop = highlightSectionInView(render(), window)

    scrollTo({ 'section-1': -2000, 'section-1.1': -900, 'section-2': 50 })

    expect(document.querySelector('[aria-current="location"]').getAttribute('href')).toBe('#section-2')
    expect(document.querySelectorAll('[aria-current]')).toHaveLength(1)
  })

  test('Should highlight the first section before the reader reaches it', () => {
    tops['section-1'] = 500

    stop = highlightSectionInView(render(), window)

    expect(current()).toEqual(['#section-1'])
  })

  test('Should scroll the outline, not the page, to keep the highlighted link in it', () => {
    const outline = render()
    let scrollTop = 0
    Object.defineProperty(outline, 'scrollTop', { get: () => scrollTop, set: (value) => { scrollTop = value } })
    outline.getBoundingClientRect = () => ({ top: 0, bottom: 300 })
    outline.querySelector('[href="#section-2"]').getBoundingClientRect = () => ({ top: 400, bottom: 430 })
    stop = highlightSectionInView(outline, window)

    scrollTo({ 'section-1': -2000, 'section-1.1': -900, 'section-2': 50 })

    expect(scrollTop).toBe(430 - 300)
  })

  test('Should stop following the scroll when stopped', () => {
    highlightSectionInView(render(), window)()

    scrollTo({ 'section-1': -2000, 'section-1.1': -900, 'section-2': 50 })

    expect(current()).toEqual(['#section-1'])
  })

  test('Should do nothing on a page without an outline', () => {
    expect(() => highlightSectionInView(null, window)()).not.toThrow()
  })
})
