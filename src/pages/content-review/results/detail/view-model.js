import { contentReviewBreadcrumbs } from '../../../common/breadcrumbs.js'
import { buildFindingDetailViewModel } from '../../../../common/finding-detail-view-model.js'
import { normaliseFindings } from '../view-model.js'

/**
 * Build the view model for a single content-review finding, or null if the
 * index is out of range (stale or invalid link).
 *
 * @param {object} result - The review response payload.
 * @param {string} documentId
 * @param {number} index
 * @param {string} jobId
 * @param {object|null} feedback
 * @param {{ errorMessage?: string|null, alreadySubmittedNotice?: boolean }} [options]
 * @returns {object|null}
 */
function detailViewModel (result, documentId, index, jobId, feedback = null, options = {}) {
  const { errorMessage = null, alreadySubmittedNotice = false } = options
  const findings = normaliseFindings(result)
  const finding = findings[index]

  if (!finding) {
    return null
  }

  const resultsHref = `/content-review/${documentId}/results`

  return buildFindingDetailViewModel({
    finding,
    page: 'content-review',
    agent: 'reviewer',
    jobId,
    index,
    total: findings.length,
    caption: result.document_title,
    feedback,
    errorMessage,
    alreadySubmittedNotice,
    actionUrl: `/content-review/${documentId}/results/${index}`,
    backHref: resultsHref,
    breadcrumbs: [
      ...contentReviewBreadcrumbs(),
      { text: result.document_title, href: resultsHref }
    ]
  })
}

export {
  detailViewModel
}
