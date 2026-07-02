import { contentReviewBreadcrumbs } from '../../../common/breadcrumbs.js'
import { severitySummaryRows, buildSeverityGroups } from '../../../../common/findings.js'

const STANDARD_LABELS = {
  gds: 'GDS content standards',
  defra_style: 'DEFRA style guide'
}

const REVIEW_COMPLETE_LABEL = 'Review complete'

const STATUS_LABELS = {
  approved: 'No issues found',
  review_completed: REVIEW_COMPLETE_LABEL,
  max_iterations_reached: REVIEW_COMPLETE_LABEL
}

/**
 * Flatten critique findings across both standards into the normalised shape
 * shared with the detail page. The stable `id` is the finding's position in
 * this flattened (GDS-then-DEFRA, in-report-order) list.
 *
 * @param {object} result
 * @returns {object[]}
 */
function normaliseFindings (result) {
  const findings = []

  for (const report of result.reports ?? []) {
    const standardLabel = STANDARD_LABELS[report.standard] ?? report.standard

    for (const finding of report.findings ?? []) {
      findings.push({
        id: findings.length,
        title: finding.what,
        location: `${finding.where} · ${standardLabel}`,
        severity: finding.severity,
        sections: [
          ...(finding.quote
            ? [{ heading: 'In the document', body: finding.quote, isQuote: true }]
            : []),
          { heading: 'Why it matters', body: finding.why },
          { heading: 'Recommendation', body: finding.fix },
          ...(finding.rule_reference
            ? [{ heading: 'Reference', body: finding.rule_reference }]
            : [])
        ]
      })
    }
  }

  return findings
}

/**
 * @param {object} result - The critique response, plus documentTitle.
 * @param {string} documentId
 * @returns {object}
 */
function resultsViewModel (result, documentId) {
  const findings = normaliseFindings(result)
  const groups = buildSeverityGroups(
    findings,
    (id) => `/content-review/${documentId}/results/v2/${id}`
  )

  const conformanceSummaries = (result.reports ?? []).map((report) => ({
    label: STANDARD_LABELS[report.standard] ?? report.standard,
    summary: report.conformance_summary
  }))

  return {
    pageTitle: result.documentTitle,
    page: 'content-review',
    documentTitle: result.documentTitle,
    statusLabel: STATUS_LABELS[result.status] ?? REVIEW_COMPLETE_LABEL,
    hasFindings: findings.length > 0,
    totalFindings: findings.length,
    severityRows: severitySummaryRows(findings),
    importantItems: groups.important,
    suggestionItems: groups.suggestions,
    conformanceSummaries,
    invariantWarnings: result.invariant_warnings ?? [],
    usage: result.usage ?? null,
    originalResultsHref: `/content-review/${documentId}/results`,
    breadcrumbs: [
      ...contentReviewBreadcrumbs(),
      { text: result.documentTitle, href: '#' }
    ]
  }
}

export {
  resultsViewModel,
  normaliseFindings
}
