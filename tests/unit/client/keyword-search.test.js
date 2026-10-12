// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'

import {
  findKeywords,
  sectionsMatching
} from '../../../src/client/javascripts/keyword-search/highlight.js'

const STEP_2 = '?view=steps&step=2'

// A guide as the page renders it, with an outline linking every section:
// whole, or in the stepper at step 1 (sections 1 and 1.1), whose step 2 holds
// section 2.
function render ({ stepper = false, keywords = '' } = {}) {
  document.body.innerHTML = `
    <form data-module="keyword-search">
      <input id="keywords" type="search" value="${keywords}">
      <p data-keyword-search-status></p>
    </form>
    <nav data-module="${stepper ? 'guide-step-outline' : 'guide-outline'}">
      <a class="app-toc__link" href="#section-1">1 Land checks</a>
      <a class="app-toc__link" href="#section-1.1">1.1 Scope</a>
      <a class="app-toc__link" href="${stepper ? STEP_2 : ''}#section-2">2 Letters</a>
    </nav>
    <div class="app-guidance-content">
      <p>Read this first.</p>
      <section class="app-guide-section" id="section-1">
        <h2>1 Land checks</h2>
        <p>Check the <strong>land</strong> use in SITI Agri.</p>
      </section>
      <section class="app-guide-section" id="section-1.1">
        <h3>1.1 Scope</h3>
        <p>Who it is for.</p>
      </section>
      ${stepper ? '' : '<section class="app-guide-section" id="section-2"><h2>2 Letters</h2><p>Send a letter about the land.</p></section>'}
    </div>
  `
  return {
    form: document.querySelector('[data-module="keyword-search"]'),
    input: document.getElementById('keywords'),
    content: document.querySelector('.app-guidance-content'),
    outline: document.querySelector('nav')
  }
}

// The whole guide, as the page serves it, for the sections in other steps.
const wholeGuide = `
  <div class="app-guidance-content">
    <section class="app-guide-section" id="section-1"><h2>1 Land checks</h2><p>Check the land use.</p></section>
    <section class="app-guide-section" id="section-1.1"><h3>1.1 Scope</h3><p>Who it is for.</p></section>
    <section class="app-guide-section" id="section-2"><h2>2 Letters</h2><p>Send a letter about the land.</p></section>
  </div>
`

const marked = () => Array.from(document.querySelectorAll('mark.app-keyword-match')).map((mark) => mark.textContent)

// Which match is current, by its place among them all.
const currentMatch = () => Array.from(document.querySelectorAll('mark.app-keyword-match'))
  .findIndex((mark) => mark.classList.contains('app-keyword-match--current'))

const matchingLinks = () => Array.from(document.querySelectorAll('.app-toc__link--match')).map((link) => link.getAttribute('href'))

const status = () => document.querySelector('[data-keyword-search-status]').textContent.trim()

// jsdom does not scroll; each test that cares says where things are.
beforeEach(() => {
  vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
})

// Go back through the matches, as Shift-Enter does in the search box.
async function searchBack (elements, text) {
  elements.input.value = text
  elements.input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true }))
  await vi.waitFor(() => expect(status()).not.toBe(''))
}

// Submit the search, as the Enter key does, and wait for it to show.
async function search (elements, text) {
  elements.input.value = text
  elements.form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
  await vi.waitFor(() => expect(status()).not.toBe(''))
}

describe('#sectionsMatching', () => {
  test('Should name each section holding a keyword, in any case, without changing it', () => {
    const { content } = render()

    expect(sectionsMatching(content, 'land')).toEqual(['section-1', 'section-2'])
    expect(marked()).toEqual([])
  })
})

describe('#findKeywords in the whole guide', () => {
  let elements

  beforeEach(() => {
    window.location.hash = ''
    elements = render()
    findKeywords(elements.form, { input: elements.input, content: elements.content, outline: elements.outline })
  })

  test('Should highlight every match in the guide, keeping its case', async () => {
    await search(elements, 'land')

    expect(marked()).toEqual(['Land', 'land', 'land'])
  })

  test('Should match several words only as that whole phrase, even across bold', async () => {
    await search(elements, 'LAND use')

    // One match, in two pieces: the bold "land" and the " use" after it.
    expect(marked()).toEqual(['land', ' use'])
    expect(status()).toBe('Match 1 of 1, in 1 section')
  })

  test('Should mark every piece of a match crossing bold as the current match', async () => {
    await search(elements, 'land use')

    expect(document.querySelectorAll('mark.app-keyword-match--current')).toHaveLength(2)
  })

  test('Should match one word only as a whole word', async () => {
    await search(elements, 'let')

    expect(marked()).toEqual([])
    expect(status()).toBe('No matches for let')
  })

  test('Should not run words in separate blocks together', async () => {
    await search(elements, 'checks check')

    expect(marked()).toEqual([])
  })

  test('Should keep the guide\'s text as it was, apart from the highlights', async () => {
    const before = elements.content.textContent

    await search(elements, 'land')

    expect(elements.content.textContent).toBe(before)
  })

  test('Should highlight, in the outline, each section with a match', async () => {
    await search(elements, 'land')

    expect(matchingLinks()).toEqual(['#section-1', '#section-2'])
  })

  test('Should start at the first match, and say where it is among them', async () => {
    await search(elements, 'land')

    expect(currentMatch()).toBe(0)
    expect(status()).toBe('Match 1 of 3, in 2 sections')
  })

  describe('bringing a match out of sight into view', () => {
    // A window 800px high, under a search box 60px high; section 2's heading
    // at 900px, and its match for "send" where each test puts it.
    const layOut = (matchTop) => {
      window.innerHeight = 800
      Object.defineProperty(elements.form, 'offsetHeight', { value: 60, configurable: true })
      document.querySelector('#section-2 h2').getBoundingClientRect = () => ({ top: 900 })
      window.HTMLElement.prototype.getBoundingClientRect = function () {
        return this.matches('mark') ? { top: matchTop, bottom: matchTop + 20 } : { top: 0, bottom: 0 }
      }
    }

    afterEach(() => {
      delete window.HTMLElement.prototype.getBoundingClientRect
    })

    test('Should scroll its section\'s heading to just below the search box, when the match then shows too', async () => {
      layOut(950)

      await search(elements, 'send')

      // The heading goes from 900px to 60px + 16px.
      expect(window.scrollBy).toHaveBeenCalledWith(0, 824)
    })

    test('Should scroll the match to the middle of what shows, when its section is too long to show both', async () => {
      layOut(2000)

      await search(elements, 'send')

      // The match's middle, 2010px, to the middle of 76px to 784px.
      expect(window.scrollBy).toHaveBeenCalledWith(0, 1580)
    })

    test('Should leave the page where it is when the match is in sight', async () => {
      layOut(300)

      await search(elements, 'send')

      expect(window.scrollBy).not.toHaveBeenCalled()
    })
  })

  test('Should scroll the outline to the current match\'s section when its link is out of sight', async () => {
    // jsdom lays nothing out: the outline shows its top 100px, and the link to
    // section 2 sits 200px below that.
    elements.outline.getBoundingClientRect = () => ({ top: 0, bottom: 100 })
    for (const link of elements.outline.querySelectorAll('a')) {
      const top = link.hash === '#section-2' ? 280 : 0
      link.getBoundingClientRect = () => ({ top, bottom: top + 20 })
    }

    await search(elements, 'letter')

    expect(elements.outline.scrollTop).toBe(200)
  })

  test('Should tell the outline each time it moves to a match, so it can show the match\'s section', async () => {
    const told = vi.fn()
    document.addEventListener('keyword-search:match', told)

    await search(elements, 'land')
    await search(elements, 'land')

    expect(told).toHaveBeenCalledTimes(2)
    document.removeEventListener('keyword-search:match', told)
  })

  test('Should go to the next match each time the same search is made again', async () => {
    await search(elements, 'land')
    await search(elements, 'land')
    await search(elements, 'land')

    expect(currentMatch()).toBe(2)
    expect(status()).toBe('Match 3 of 3, in 2 sections')
  })

  test('Should go back to the first match after the last', async () => {
    await search(elements, 'letter')
    await search(elements, 'letter')
    await search(elements, 'letter')

    expect(currentMatch()).toBe(0)
  })

  test('Should go back to the match before on Shift-Enter, and to the last before the first', async () => {
    await search(elements, 'land')
    await search(elements, 'land')
    await searchBack(elements, 'land')

    expect(currentMatch()).toBe(0)

    await searchBack(elements, 'land')

    expect(currentMatch()).toBe(2)
    expect(status()).toBe('Match 3 of 3, in 2 sections')
  })

  test('Should start a new search at the last match on Shift-Enter', async () => {
    await searchBack(elements, 'land')

    expect(currentMatch()).toBe(2)
  })

  test('Should leave Enter without Shift to the form', () => {
    const event = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })

    elements.input.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })

  test('Should start again at the first match when the search changes', async () => {
    await search(elements, 'land')
    await search(elements, 'land')
    await search(elements, 'land use')

    expect(currentMatch()).toBe(0)
  })

  test('Should say when it finds nothing', async () => {
    await search(elements, 'bovine')

    expect(marked()).toEqual([])
    expect(matchingLinks()).toEqual([])
    expect(status()).toBe('No matches for bovine')
  })

  test('Should clear the last search\'s highlights before showing the next', async () => {
    await search(elements, 'land')
    await search(elements, 'scope')

    expect(marked()).toEqual(['Scope'])
    expect(matchingLinks()).toEqual(['#section-1.1'])
  })

  test('Should clear every highlight when the search is emptied', async () => {
    await search(elements, 'land')
    elements.input.value = ''
    elements.form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))

    expect(marked()).toEqual([])
    expect(matchingLinks()).toEqual([])
    expect(status()).toBe('')
  })

  test('Should search the page without leaving it', () => {
    const event = new window.Event('submit', { bubbles: true, cancelable: true })

    elements.form.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })
})

describe('#findKeywords on a page opened with a search', () => {
  test('Should search at once for the words already in the box', async () => {
    window.location.hash = ''
    const elements = render({ keywords: 'land' })

    findKeywords(elements.form, { input: elements.input, content: elements.content, outline: elements.outline })

    await vi.waitFor(() => expect(status()).toBe('Match 1 of 3, in 2 sections'))
    expect(marked()).toEqual(['Land', 'land', 'land'])
  })

  test('Should start at the first match in the section the page opened at', async () => {
    window.location.hash = '#section-2'
    const elements = render({ keywords: 'land' })

    findKeywords(elements.form, { input: elements.input, content: elements.content, outline: elements.outline })

    await vi.waitFor(() => expect(status()).toBe('Match 3 of 3, in 2 sections'))
    expect(currentMatch()).toBe(2)
  })
})

describe('#findKeywords on a page still loading when opened with a search', () => {
  afterEach(() => {
    delete document.readyState
    delete window.HTMLElement.prototype.getBoundingClientRect
  })

  test('Should bring the match into view again once the page has loaded, after the browser\'s own jump to the section', async () => {
    window.history.replaceState(null, '', '/?keywords=send#section-2')
    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true })
    const elements = render({ keywords: 'send' })
    window.innerHeight = 800
    // The match is below the window: the browser jumped to the section's top.
    window.HTMLElement.prototype.getBoundingClientRect = function () {
      return this.matches('mark') ? { top: 2000, bottom: 2020 } : { top: 0, bottom: 0 }
    }

    findKeywords(elements.form, { input: elements.input, content: elements.content, outline: elements.outline })
    await vi.waitFor(() => expect(status()).toBe('Match 1 of 1, in 1 section'))
    window.scrollBy.mockClear()

    window.dispatchEvent(new window.Event('load'))

    await vi.waitFor(() => expect(window.scrollBy).toHaveBeenCalled())
  })

  test('Should put the reader back in the search box once the page has loaded, after the browser\'s jump to the section took them out of it', async () => {
    window.history.replaceState(null, '', '/?keywords=send#section-2')
    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true })
    const elements = render({ keywords: 'send' })
    findKeywords(elements.form, { input: elements.input, content: elements.content, outline: elements.outline })
    await vi.waitFor(() => expect(status()).toBe('Match 1 of 1, in 1 section'))
    // The browser's jump to a section that cannot take focus leaves the page with it.
    elements.input.blur()

    window.dispatchEvent(new window.Event('load'))

    await vi.waitFor(() => expect(document.activeElement).toBe(elements.input))
  })

  test('Should not wait for the page to load when it already has', async () => {
    window.history.replaceState(null, '', '/?keywords=send#section-2')
    const elements = render({ keywords: 'send' })
    const listen = vi.spyOn(window, 'addEventListener')

    findKeywords(elements.form, { input: elements.input, content: elements.content, outline: elements.outline })
    await vi.waitFor(() => expect(status()).toBe('Match 1 of 1, in 1 section'))

    expect(listen).not.toHaveBeenCalledWith('load', expect.anything(), expect.anything())
  })
})

describe('#findKeywords on a page opened going back', () => {
  test('Should start at the last match in the section the page opened at', async () => {
    window.history.replaceState(null, '', '/?keywords=land&match=last#section-1')
    const elements = render({ keywords: 'land' })

    findKeywords(elements.form, { input: elements.input, content: elements.content, outline: elements.outline })

    await vi.waitFor(() => expect(status()).toBe('Match 2 of 3, in 2 sections'))
    expect(currentMatch()).toBe(1)
  })
})

describe('#findKeywords in the stepper', () => {
  let elements
  let fetchGuide
  let go

  const start = () => {
    findKeywords(elements.form, { input: elements.input, content: elements.content, outline: elements.outline, fetchGuide, go })
  }

  beforeEach(() => {
    window.location.hash = ''
    elements = render({ stepper: true })
    fetchGuide = vi.fn().mockResolvedValue(wholeGuide)
    go = vi.fn()
  })

  // Where the stepper was sent, as the step, the search and the section.
  const wentTo = () => {
    const url = new URL(go.mock.calls.at(-1)[0])
    return { step: url.searchParams.get('step'), keywords: url.searchParams.get('keywords'), match: url.searchParams.get('match'), hash: url.hash }
  }

  test('Should highlight, in the outline, the sections with a match in other steps too', async () => {
    start()

    await search(elements, 'land')
    await vi.waitFor(() => expect(matchingLinks()).toHaveLength(2))

    expect(marked()).toEqual(['Land', 'land'])
    expect(matchingLinks()).toEqual(['#section-1', `${STEP_2}#section-2`])
  })

  test('Should say where the current match is among this step\'s', async () => {
    start()

    await search(elements, 'land')

    expect(status()).toBe('Match 1 of 2 in this step')
  })

  test('Should fetch the whole guide once, however many searches follow', async () => {
    start()

    await search(elements, 'land')
    await search(elements, 'scope')
    await vi.waitFor(() => expect(matchingLinks()).toEqual(['#section-1.1']))

    expect(fetchGuide).toHaveBeenCalledTimes(1)
  })

  test('Should go to the step holding the next match after this step\'s last, keeping the search', async () => {
    start()

    await search(elements, 'land')
    await search(elements, 'land')
    await search(elements, 'land')
    await vi.waitFor(() => expect(go).toHaveBeenCalled())

    expect(wentTo()).toEqual({ step: '2', keywords: 'land', match: null, hash: '#section-2' })
  })

  test('Should go straight to the step holding a match when this step has none', async () => {
    start()

    await search(elements, 'letter')
    await vi.waitFor(() => expect(go).toHaveBeenCalled())

    expect(wentTo()).toEqual({ step: '2', keywords: 'letter', match: null, hash: '#section-2' })
  })

  test('Should go back, before this step\'s first match, to the last match of the step holding the match before', async () => {
    start()

    await search(elements, 'land')
    await searchBack(elements, 'land')
    await vi.waitFor(() => expect(go).toHaveBeenCalled())

    // Step 1 has no step before it, so back goes round to the last step.
    expect(wentTo()).toEqual({ step: '2', keywords: 'land', match: 'last', hash: '#section-2' })
  })

  test('Should go back to this step\'s first match when no other step has one', async () => {
    start()

    await search(elements, 'who')
    await search(elements, 'who')

    expect(currentMatch()).toBe(0)
    expect(go).not.toHaveBeenCalled()
  })

  test('Should stay in this step when the whole guide cannot be fetched', async () => {
    fetchGuide = vi.fn().mockRejectedValue(new Error('offline'))
    start()

    await search(elements, 'land')
    await search(elements, 'land')
    await search(elements, 'land')
    await vi.waitFor(() => expect(currentMatch()).toBe(0))

    expect(marked()).toEqual(['Land', 'land'])
    expect(matchingLinks()).toEqual(['#section-1'])
    expect(go).not.toHaveBeenCalled()
  })
})

describe('#findKeywords without a form', () => {
  test('Should do nothing on a page with no keyword search', () => {
    expect(() => findKeywords(null, {})).not.toThrow()
  })
})
