import { publishingChecksBreadcrumbs } from '../../common/breadcrumbs.js'

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info']
const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }

function _worstSeverity (findings) {
  return findings.reduce((worst, f) => {
    const curr = SEVERITY_RANK[f.severity] ?? SEVERITY_RANK.info

    return Math.min(curr, worst)
  }, SEVERITY_RANK.info)
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

function groupFindingsByCategory (findings) {
  if (!Array.isArray(findings) || findings.length === 0) { return [] }

  const byCategory = findings.reduce((acc, f) => {
    const category = f.category ?? 'Uncategorised'
    if (!acc.has(category)) { acc.set(category, []) }
    acc.get(category).push(f)
    return acc
  }, new Map())

  return Array.from(byCategory.entries()).map(([category, categoryFindings]) => ({
    category,
    worst: _worstSeverity(categoryFindings),
    count: categoryFindings.length,
    findings: categoryFindings
  }))
}

/**
 * @param {object} result
 * @param {string} [documentId]
 * @returns {object}
 */
function resultsViewModel (result, documentId) {
  return {
    pageTitle: result.document_title,
    page: 'publishing-checks',
    result,
    severityCounts: _buildSeverityCounts(result.findings ?? []),
    findingGroups: groupFindingsByCategory(result.findings ?? []),
    resultsV2Href: documentId
      ? `/publishing-checks/${documentId}/results/v2`
      : null,
    breadcrumbs: [
      ...publishingChecksBreadcrumbs(),
      { text: result.document_title, href: '#' }
    ]
  }
}

export {
  resultsViewModel
}
