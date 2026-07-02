import { publishingChecksBreadcrumbs } from '../../../../common/breadcrumbs.js'
import { severityTag } from '../../../../../common/findings.js'
import { normaliseFindings } from '../view-model.js'

/**
 * Build the view model for a single publishing finding, or null if the index
 * is out of range (stale or invalid link).
 *
 * @param {object} result
 * @param {string} documentId
 * @param {number} index
 * @returns {object|null}
 */
function detailViewModel (result, documentId, index) {
  const finding = normaliseFindings(result)[index]

  if (!finding) {
    return null
  }

  const resultsHref = `/publishing-checks/${documentId}/results/v2`

  return {
    pageTitle: finding.title,
    page: 'publishing-checks',
    finding: { ...finding, severityTag: severityTag(finding.severity) },
    backHref: resultsHref,
    breadcrumbs: [
      ...publishingChecksBreadcrumbs(),
      { text: result.document_title, href: resultsHref }
    ]
  }
}

export {
  detailViewModel
}
