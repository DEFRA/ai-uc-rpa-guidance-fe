import { publishingChecksBreadcrumbs } from '../../../../common/breadcrumbs.js'
import { buildFindingDetailViewModel } from '../../../../../common/finding-detail-view-model.js'
import { normaliseFindings } from '../view-model.js'

/**
 * Build the view model for a single publishing finding, or null if the index
 * is out of range (stale or invalid link).
 *
 * @param {object} result
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

  const resultsHref = `/publishing-checks/${documentId}/results/v2`

  return buildFindingDetailViewModel({
    finding,
    page: 'publishing-checks',
    agent: 'checker',
    jobId,
    index,
    total: findings.length,
    caption: result.document_title,
    feedback,
    errorMessage,
    alreadySubmittedNotice,
    actionUrl: `/publishing-checks/${documentId}/results/v2/${index}`,
    backHref: resultsHref,
    breadcrumbs: [
      ...publishingChecksBreadcrumbs(),
      { text: result.document_title, href: resultsHref }
    ]
  })
}

export {
  detailViewModel
}
