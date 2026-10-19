import { homeCrumb } from '../../../common/breadcrumbs.js'

// A check still under way shows how far it has got.
const UNDER_WAY = new Set(['pending', 'running'])

/**
 * "3/6 sections" while a check is under way, or null.
 *
 * @param {import('../../../../services/quality-checks.js').QualityCheckRun} run
 * @returns {string|null}
 */
function progressOf (run) {
  return UNDER_WAY.has(run.status) && run.sectionsTotal
    ? `${run.sectionsDone ?? 0}/${run.sectionsTotal} sections`
    : null
}

/**
 * @param {import('../../../../services/quality-checks.js').QualityCheckRun[]} runs
 * @returns {object}
 */
function statusViewModel (runs) {
  return {
    pageTitle: 'Prototype quality checks',
    page: 'quality-checks',
    runs: runs.map(run => ({ ...run, progress: progressOf(run) })),
    breadcrumbs: [homeCrumb]
  }
}

export {
  statusViewModel
}
