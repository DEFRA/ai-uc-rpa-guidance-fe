import { contentReviewBreadcrumbs } from '../../../../common/breadcrumbs.js'
import { severityTag } from '../../../../../common/findings.js'
import { normaliseFindings } from '../view-model.js'

/**
 * Build the view model for a single content-review finding, or null if the
 * index is out of range (stale or invalid link).
 *
 * @param {object} result - The critique response, plus documentTitle.
 * @param {string} documentId
 * @param {number} index
 * @returns {object|null}
 */
function detailViewModel (result, documentId, index) {
  const finding = normaliseFindings(result)[index]

  if (!finding) {
    return null
  }

  const resultsHref = `/content-review/${documentId}/results/v2`

  return {
    pageTitle: finding.title,
    page: 'content-review',
    finding: { ...finding, severityTag: severityTag(finding.severity) },
    backHref: resultsHref,
    breadcrumbs: [
      ...contentReviewBreadcrumbs(),
      { text: result.documentTitle, href: resultsHref }
    ]
  }
}

export {
  detailViewModel
}
