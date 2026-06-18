import { publishingChecksBreadcrumbs } from '../../common/breadcrumbs.js'

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info']
const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }

function _worstSeverity (findings) {
  return findings.reduce((worst, f) => {
    return (SEVERITY_RANK[f.severity] ?? 99) < (SEVERITY_RANK[worst] ?? 99)
      ? f.severity
      : worst
  }, 'info')
}

function _buildSeverityCounts (findings) {
  const counts = {}
  for (const finding of findings) {
    counts[finding.severity] = (counts[finding.severity] ?? 0) + 1
  }
  return SEVERITY_ORDER
    .filter(severity => counts[severity] > 0)
    .map(severity => ({ severity, count: counts[severity] }))
}

function groupFindingsByCategory (findings) {
  if (!Array.isArray(findings) || findings.length === 0) return []

  const byCategory = new Map()
  for (const finding of findings) {
    const category = finding.category ?? 'Uncategorised'
    if (!byCategory.has(category)) byCategory.set(category, [])
    byCategory.get(category).push(finding)
  }

  return Array.from(byCategory.entries()).map(([category, categoryFindings]) => ({
    category,
    worst: _worstSeverity(categoryFindings),
    count: categoryFindings.length,
    findings: categoryFindings
  }))
}

/**
 * @param {object} result
 * @returns {object}
 */
function resultsViewModel (result) {
  return {
    pageTitle: result.document_title,
    page: 'publishing-checks',
    result,
    severityCounts: _buildSeverityCounts(result.findings ?? []),
    findingGroups: groupFindingsByCategory(result.findings ?? []),
    breadcrumbs: [
      ...publishingChecksBreadcrumbs(),
      { text: result.document_title, href: '#' }
    ]
  }
}

export {
  resultsViewModel
}
