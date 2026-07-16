import { contentReviewBreadcrumbs } from '../../../../common/breadcrumbs.js'
import { buildFindingDetailViewModel } from '../../../../../common/finding-detail-view-model.js'
import { normaliseFindings } from '../view-model.js'

/**
 * Build the view model for a single content-review finding, or null if the
 * index is out of range (stale or invalid link).
 *
 * @param {object} result - The critique response, plus documentTitle.
 * @param {string} documentId
 * @param {number} index
 * @param {string} jobId
 * @param {object|null} feedback
 * @param {{ errorMessage?: string|null, alreadySubmittedNotice?: boolean }} [options]
 * @returns {object|null}
 */
function detailViewModel (result, documentId, index, jobId, feedback = null, options = {}) {
  const { errorMessage = null, alreadySubmittedNotice = false } = options
  const finding = normaliseFindings(result)[index]

  if (!finding) {
    return null
  }

  const resultsHref = `/content-review/${documentId}/results/v2`

  return buildFindingDetailViewModel({
    finding,
    page: 'content-review',
    agent: 'critic',
    jobId,
    index,
    feedback,
    errorMessage,
    alreadySubmittedNotice,
    actionUrl: `/content-review/${documentId}/results/v2/${index}`,
    backHref: resultsHref,
    breadcrumbs: [
      ...contentReviewBreadcrumbs(),
      { text: result.documentTitle, href: resultsHref }
    ]
  })
}

export {
  detailViewModel
}
