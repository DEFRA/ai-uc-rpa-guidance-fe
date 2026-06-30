import { contentReviewBreadcrumbs } from '../../common/breadcrumbs.js'

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low']
const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 }

const STANDARD_LABELS = {
  gds: 'GDS content standards',
  defra_style: 'DEFRA style guide'
}

const STATUS_LABELS = {
  approved: 'No issues found',
  review_completed: 'Review complete',
  max_iterations_reached: 'Review complete'
}

function _worstSeverity (findings) {
  if (!findings.length) { return 'low' }

  const rank = findings.reduce((worst, f) => {
    const curr = SEVERITY_RANK[f.severity] ?? SEVERITY_RANK.low
    return Math.min(curr, worst)
  }, SEVERITY_RANK.low)

  return SEVERITY_ORDER[rank]
}

function _buildSeverityCounts (findings) {
  const counts = findings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1
    return acc
  }, {})

  return SEVERITY_ORDER
    .filter(severity => counts[severity] > 0)
    .map(severity => ({ severity, count: counts[severity] }))
}

/**
 * @param {object} result - The critique response, plus documentTitle.
 * @returns {object}
 */
function resultsViewModel (result) {
  const reports = (result.reports ?? []).map(report => {
    const findings = report.findings ?? []
    return {
      standard: report.standard,
      label: STANDARD_LABELS[report.standard] ?? report.standard,
      conformanceSummary: report.conformance_summary,
      findings,
      worst: _worstSeverity(findings),
      count: findings.length
    }
  })

  const allFindings = reports.flatMap(report => report.findings)

  return {
    pageTitle: result.documentTitle,
    page: 'content-review',
    documentTitle: result.documentTitle,
    statusLabel: STATUS_LABELS[result.status] ?? 'Review complete',
    hasFindings: allFindings.length > 0,
    totalFindings: allFindings.length,
    severityCounts: _buildSeverityCounts(allFindings),
    reports,
    invariantWarnings: result.invariant_warnings ?? [],
    usage: result.usage ?? null,
    breadcrumbs: [
      ...contentReviewBreadcrumbs(),
      { text: result.documentTitle, href: '#' }
    ]
  }
}

export {
  resultsViewModel
}
