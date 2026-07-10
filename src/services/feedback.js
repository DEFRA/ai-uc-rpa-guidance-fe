import * as guidanceApi from '../infra/api/guidance-api.js'
import { statusCodes } from '../constants/status-codes.js'

/**
 * Submit feedback for a finding.
 *
 * @param {{ jobId: string, agent: string, findingIndex: number, verdict: string, comment?: string }} params
 * @returns {Promise<{ ok: boolean, alreadySubmitted: boolean, data: object|null }>}
 */
async function submitFeedback ({ jobId, agent, findingIndex, verdict, comment }) {
  const res = await guidanceApi.createFeedback({ jobId, agent, findingIndex, verdict, comment })

  if (res.ok) {
    return { ok: true, alreadySubmitted: false, data: res.data }
  }

  if (res.status === statusCodes.HTTP_STATUS_CONFLICT) {
    return { ok: false, alreadySubmitted: true, data: null }
  }

  return { ok: false, alreadySubmitted: false, data: null }
}

/**
 * Fetch existing feedback for a specific finding, or null if none exists.
 *
 * @param {string} jobId
 * @param {number} findingIndex
 * @returns {Promise<object|null>}
 */
async function getFindingFeedback (jobId, findingIndex) {
  const res = await guidanceApi.getFeedbackForFinding(jobId, findingIndex)
  return res.ok ? res.data : null
}

export {
  submitFeedback,
  getFindingFeedback
}
