import { severityTag } from './findings.js'

/**
 * Assemble the common view-model shape for a single finding's detail page:
 * the finding tagged with its severity, feedback state, and navigation
 * fields shared by every "finding detail + feedback" page. Callers resolve
 * the finding (or 404) and build the domain-specific fields (urls,
 * breadcrumbs, agent) themselves and pass them in explicitly.
 *
 * @param {object} params
 * @param {{ title: string, severity: string }} params.finding
 * @param {string} params.page
 * @param {string} params.agent
 * @param {string} params.jobId
 * @param {number} params.index
 * @param {object|null} params.feedback
 * @param {string|null} params.errorMessage
 * @param {boolean} params.alreadySubmittedNotice
 * @param {string} params.actionUrl
 * @param {string} params.backHref
 * @param {object[]} params.breadcrumbs
 * @returns {object}
 */
function buildFindingDetailViewModel ({
  finding,
  page,
  agent,
  jobId,
  index,
  feedback,
  errorMessage,
  alreadySubmittedNotice,
  actionUrl,
  backHref,
  breadcrumbs
}) {
  return {
    pageTitle: finding.title,
    page,
    finding: { ...finding, severityTag: severityTag(finding.severity) },
    jobId,
    findingIndex: index,
    agent,
    feedback,
    feedbackSubmitted: feedback !== null,
    errorMessage,
    alreadySubmittedNotice,
    actionUrl,
    backHref,
    breadcrumbs
  }
}

export { buildFindingDetailViewModel }
