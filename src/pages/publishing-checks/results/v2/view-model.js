import { publishingChecksBreadcrumbs } from '../../../common/breadcrumbs.js'
import { severitySummaryRows, buildSeverityGroups } from '../../../../common/findings.js'

/**
 * Flatten publishing findings into the normalised shape shared with the detail
 * page. The stable `id` is the finding's position in the result's findings
 * array, so list links and detail lookups stay consistent.
 *
 * @param {object} result
 * @returns {object[]}
 */
function normaliseFindings (result) {
  return (result.findings ?? []).map((finding, id) => ({
    id,
    title: finding.issue,
    location: finding.section,
    severity: finding.severity,
    sections: [
      { heading: 'Why it matters', body: finding.why_it_matters },
      { heading: 'Recommendation', body: finding.recommendation }
    ]
  }))
}

/**
 * @param {object} result
 * @param {string} documentId
 * @returns {object}
 */
function resultsViewModel (result, documentId) {
  const findings = normaliseFindings(result)
  const groups = buildSeverityGroups(
    findings,
    (id) => `/publishing-checks/${documentId}/results/v2/${id}`
  )

  return {
    pageTitle: result.document_title,
    page: 'publishing-checks',
    documentTitle: result.document_title,
    verdict: result.verdict,
    summary: result.summary,
    goodPoints: result.good_points ?? [],
    usage: result.usage ?? null,
    totalFindings: findings.length,
    severityRows: severitySummaryRows(findings),
    importantItems: groups.important,
    suggestionItems: groups.suggestions,
    originalResultsHref: `/publishing-checks/${documentId}/results`,
    breadcrumbs: [
      ...publishingChecksBreadcrumbs(),
      { text: result.document_title, href: '#' }
    ]
  }
}

export {
  resultsViewModel,
  normaliseFindings
}
