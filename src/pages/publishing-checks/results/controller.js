import { statusCodes } from '../../../constants/status-codes.js'
import { analyseDocument } from '../../../infra/api/analyse.js'

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info']

/**
 * Counts findings by severity level, in canonical severity order.
 *
 * @param {import('../../../infra/api/analyse.js').FindingResponse[]} findings
 * @returns {Array<{severity: string, count: number}>}
 */
function buildSeverityCounts (findings) {
  const counts = {}
  for (const finding of findings) {
    counts[finding.severity] = (counts[finding.severity] ?? 0) + 1
  }
  return SEVERITY_ORDER
    .filter(severity => counts[severity] > 0)
    .map(severity => ({ severity, count: counts[severity] }))
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getPublishingCheckResults (request, h) {
  const { documentId } = request.params

  const result = await analyseDocument(documentId)

  const severityCounts = buildSeverityCounts(result.findings ?? [])

  return h.view('publishing-checks/results/page.njk', {
    pageTitle: result.document_title,
    page: 'publishing-checks',
    result,
    severityCounts,
    breadcrumbs: [
      { text: 'Home', href: '/' },
      { text: 'Publishing checks', href: '/publishing-checks' },
      { text: result.document_title, href: '#' }
    ]
  }).code(statusCodes.HTTP_STATUS_OK)
}

export {
  getPublishingCheckResults,
  buildSeverityCounts
}
