import * as guidanceApi from '../infra/api/guidance-api.js'
import { StartCheckOutcome } from '../models/publishing-checks.js'
import { listPrototypeGuides } from './prototype-guides.js'

// Quality checks run on the prototype guides, in the API, one job a check.
// A guide's status here is the status of its latest check.

/**
 * @typedef {Object} QualityCheckRun
 * @property {string} documentId
 * @property {string} title
 * @property {string} status - not_run, pending, running, completed or error
 * @property {string|null} jobId
 * @property {string|null} updatedAt
 * @property {number|null} sectionsDone - top-level sections checked so far
 * @property {number|null} sectionsTotal - top-level sections in the guide
 */

/**
 * @private
 *
 * The latest check of one guide. A guide never checked (404) is not_run;
 * unexpected errors surface to the catch-all.
 *
 * @param {object} guide - a guide as listPrototypeGuides gives it
 * @returns {Promise<QualityCheckRun>}
 */
async function _fetchQualityCheckRun (guide) {
  const base = {
    documentId: guide.documentId,
    title: guide.title || guide.name
  }

  const res = await guidanceApi.getLatestQualityCheck(guide.documentId)

  if (!res.ok) {
    return { ...base, status: 'not_run', jobId: null, updatedAt: null, sectionsDone: null, sectionsTotal: null }
  }

  return {
    ...base,
    status: res.data.status,
    jobId: res.data.jobId,
    updatedAt: res.data.updatedAt,
    sectionsDone: res.data.sectionsDone ?? null,
    sectionsTotal: res.data.sectionsTotal ?? null
  }
}

/**
 * Every prototype guide, with the status of its latest quality check.
 *
 * @returns {Promise<QualityCheckRun[]>}
 */
async function listQualityCheckRuns () {
  const guides = await listPrototypeGuides()

  return Promise.all(guides.map(_fetchQualityCheckRun))
}

/**
 * Starts a quality check of a prototype guide's latest version. A guide the
 * API cannot find (404) is a form-level error; anything else unexpected
 * surfaces to the catch-all.
 *
 * @param {string} documentId
 * @returns {Promise<StartCheckOutcome>}
 */
async function startQualityCheck (documentId) {
  const res = await guidanceApi.startQualityCheck(documentId)

  return res.ok
    ? StartCheckOutcome.success(res.data.jobId)
    : StartCheckOutcome.notFound()
}

export {
  listQualityCheckRuns,
  startQualityCheck
}
