// How often to ask, and the longest to wait between tries when asking fails.
const INTERVAL_MS = 2000
const MAX_BACKOFF_MS = 10000

/**
 * Follow a rebuild from its progress page, updating the bar and its label in
 * place rather than reloading the page.
 *
 * The label is written only when its text changes, because it is a live
 * region: a screen reader hears each change, not every poll.
 *
 * @param {HTMLElement | null} container The element marked
 *   data-module="rebuild-progress", or null for none.
 * @param {{ fetch?: typeof globalThis.fetch, location?: Location }} [deps]
 * @returns {() => void} Stops following.
 */
function followRebuildProgress (container, { fetch = globalThis.fetch, location = globalThis.location } = {}) {
  if (!container) {
    return () => {}
  }

  const statusUrl = container.dataset.statusUrl
  const label = container.querySelector('[data-rebuild-progress-label]')
  const progress = container.querySelector('progress')

  let timer = null
  let stopped = false

  const show = ({ completed, total, label: text }) => {
    if (progress) {
      progress.max = total
      progress.value = completed
    }

    if (label && label.textContent !== text) {
      label.textContent = text
    }
  }

  const schedule = (delay) => {
    if (!stopped) {
      timer = setTimeout(() => poll(delay), delay)
    }
  }

  const poll = async (delay) => {
    let rebuild

    try {
      const response = await fetch(statusUrl, { headers: { Accept: 'application/json' } })

      if (!response.ok) {
        throw new Error(`Status answered ${response.status}`)
      }

      rebuild = await response.json()
    } catch {
      schedule(Math.min(delay * 2, MAX_BACKOFF_MS))
      return
    }

    if (stopped) {
      return
    }

    if (rebuild.doneUrl) {
      stopped = true
      location.assign(rebuild.doneUrl)
      return
    }

    if (rebuild.status === 'cancelled') {
      // The page itself shows a cancelled rebuild.
      stopped = true
      location.reload()
      return
    }

    show(rebuild)
    schedule(INTERVAL_MS)
  }

  schedule(INTERVAL_MS)

  return () => {
    stopped = true
    clearTimeout(timer)
  }
}

export {
  followRebuildProgress
}
