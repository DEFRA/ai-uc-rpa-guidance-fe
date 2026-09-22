import { homeCrumb } from '../../../common/breadcrumbs.js'

const SECONDS_IN_A_MINUTE = 60

const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`

/**
 * How long the rebuild ran, as a reader would say it.
 *
 * @param {number} seconds
 * @returns {string|null} Null when nothing was timed, so nothing is claimed.
 */
function timeTaken (seconds) {
  const whole = Math.round(seconds)

  if (!whole) {
    return null
  }

  const minutes = Math.floor(whole / SECONDS_IN_A_MINUTE)
  const remainder = whole % SECONDS_IN_A_MINUTE

  if (!minutes) {
    return plural(remainder, 'second')
  }

  return remainder
    ? `${plural(minutes, 'minute')} ${plural(remainder, 'second')}`
    : plural(minutes, 'minute')
}

/**
 * @param {object[]} summaries
 * @param {{ purged: number, failed: number, took: number }} counts
 * @returns {object}
 */
function rebuiltViewModel (summaries, { purged, failed, took }) {
  return {
    pageTitle: 'Index rebuilt',
    summaries,
    purgedCount: purged,
    failedCount: failed,
    timeTaken: timeTaken(took),
    breadcrumbs: [
      homeCrumb,
      { text: 'Search index admin', href: '/admin/search-index' }
    ]
  }
}

export {
  rebuiltViewModel
}
