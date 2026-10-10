// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from 'vitest'

import { trapFindShortcut } from '../../../src/client/javascripts/search-shortcut/trap.js'

function press (init) {
  const event = new window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  document.dispatchEvent(event)
  return event
}

describe('#trapFindShortcut', () => {
  let input

  beforeEach(() => {
    document.body.innerHTML = '<input id="q" type="search" value="sda status">'
    input = document.getElementById('q')
  })

  test.each([
    ['Ctrl-F', { key: 'f', ctrlKey: true }],
    ['Cmd-F', { key: 'f', metaKey: true }],
    ['Ctrl-Shift-F', { key: 'F', ctrlKey: true, shiftKey: true }]
  ])('Should send %s to the search box instead of the browser', (_name, init) => {
    const cleanup = trapFindShortcut(document, input)

    const event = press(init)

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(input)
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(input.value.length)
    cleanup()
  })

  test.each([
    ['F alone', { key: 'f' }],
    ['Ctrl-G', { key: 'g', ctrlKey: true }],
    ['Ctrl-Alt-F', { key: 'f', ctrlKey: true, altKey: true }]
  ])('Should leave %s to the browser', (_name, init) => {
    const cleanup = trapFindShortcut(document, input)

    const event = press(init)

    expect(event.defaultPrevented).toBe(false)
    expect(document.activeElement).not.toBe(input)
    cleanup()
  })

  test('Should do nothing when the page has no search box', () => {
    const cleanup = trapFindShortcut(document, null)

    const event = press({ key: 'f', ctrlKey: true })

    expect(event.defaultPrevented).toBe(false)
    cleanup()
  })

  test('Should stop trapping once cleaned up', () => {
    trapFindShortcut(document, input)()

    const event = press({ key: 'f', ctrlKey: true })

    expect(event.defaultPrevented).toBe(false)
  })
})
