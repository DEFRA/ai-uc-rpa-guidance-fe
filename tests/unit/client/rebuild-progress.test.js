// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'

import { followRebuildProgress } from '../../../src/client/javascripts/rebuild-progress/follow.js'

const STATUS_URL = '/admin/search-index/rebuilds/r-1/status'

function render () {
  document.body.innerHTML = `
    <div data-module="rebuild-progress" data-status-url="${STATUS_URL}">
      <p aria-live="polite" data-rebuild-progress-label>Starting to index 17 documents</p>
      <progress max="17" value="0"></progress>
    </div>
  `
  return document.querySelector('[data-module="rebuild-progress"]')
}

function answer (body) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
}

const running = (overrides = {}) => ({
  status: 'running',
  completed: 3,
  total: 17,
  label: 'Indexing A Guide - 3 of 17 documents',
  doneUrl: null,
  ...overrides
})

describe('#followRebuildProgress', () => {
  let fetch
  let location
  let stop

  beforeEach(() => {
    vi.useFakeTimers()
    fetch = vi.fn()
    location = { assign: vi.fn(), reload: vi.fn() }
  })

  afterEach(() => {
    stop?.()
    vi.useRealTimers()
  })

  const follow = (container) => {
    stop = followRebuildProgress(container, { fetch, location })
  }

  test('Should ask for the status every two seconds', async () => {
    fetch.mockImplementation(() => answer(running()))
    follow(render())

    await vi.advanceTimersByTimeAsync(1999)
    expect(fetch).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(fetch).toHaveBeenCalledWith(STATUS_URL, expect.objectContaining({
      headers: { Accept: 'application/json' }
    }))

    await vi.advanceTimersByTimeAsync(2000)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  test('Should update the bar and the label in place', async () => {
    fetch.mockImplementation(() => answer(running()))
    const container = render()
    follow(container)

    await vi.advanceTimersByTimeAsync(2000)

    const progress = container.querySelector('progress')
    expect(progress.max).toBe(17)
    expect(progress.value).toBe(3)
    expect(container.querySelector('[data-rebuild-progress-label]').textContent)
      .toBe('Indexing A Guide - 3 of 17 documents')
  })

  test('Should not rewrite a label that has not changed', async () => {
    fetch.mockImplementation(() => answer(running()))
    const container = render()
    follow(container)
    await vi.advanceTimersByTimeAsync(2000)

    const label = container.querySelector('[data-rebuild-progress-label]')
    const writes = []
    new window.MutationObserver((records) => writes.push(...records))
      .observe(label, { childList: true, characterData: true, subtree: true })

    await vi.advanceTimersByTimeAsync(2000)
    await Promise.resolve()

    expect(writes).toHaveLength(0)
  })

  test.each(['complete', 'failed'])('Should go to the confirmation when %s, and stop', async (status) => {
    fetch.mockImplementation(() => answer(running({ status, doneUrl: '/admin/search-index/rebuilt?purged=3&failed=0&took=1' })))
    follow(render())

    await vi.advanceTimersByTimeAsync(2000)
    expect(location.assign).toHaveBeenCalledWith('/admin/search-index/rebuilt?purged=3&failed=0&took=1')

    await vi.advanceTimersByTimeAsync(10000)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('Should reload once when the rebuild was cancelled, and stop', async () => {
    fetch.mockImplementation(() => answer(running({ status: 'cancelled' })))
    follow(render())

    await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(10000)

    expect(location.reload).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('Should keep asking after a failure, backing off to ten seconds', async () => {
    fetch.mockImplementation(() => Promise.reject(new Error('offline')))
    follow(render())

    await vi.advanceTimersByTimeAsync(2000)
    expect(fetch).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(4000)
    expect(fetch).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(8000)
    expect(fetch).toHaveBeenCalledTimes(3)

    await vi.advanceTimersByTimeAsync(10000)
    expect(fetch).toHaveBeenCalledTimes(4)
  })

  test('Should treat an error answer as a failure', async () => {
    fetch
      .mockImplementationOnce(() => Promise.resolve({ ok: false, status: 502 }))
      .mockImplementation(() => answer(running()))
    follow(render())

    await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(2000)
    expect(fetch).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(2000)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  test('Should go back to two seconds once an answer comes', async () => {
    fetch
      .mockImplementationOnce(() => Promise.reject(new Error('offline')))
      .mockImplementation(() => answer(running()))
    follow(render())

    await vi.advanceTimersByTimeAsync(2000 + 4000)
    expect(fetch).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(2000)
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  test('Should do nothing on a page without the progress', async () => {
    stop = followRebuildProgress(null, { fetch, location })

    await vi.advanceTimersByTimeAsync(10000)

    expect(fetch).not.toHaveBeenCalled()
  })
})
