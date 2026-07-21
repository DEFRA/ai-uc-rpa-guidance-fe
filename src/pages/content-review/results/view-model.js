import { contentReviewBreadcrumbs } from '../../common/breadcrumbs.js'
import { severitySummaryRows, buildSeverityGroups } from '../../../common/findings.js'

const PRINCIPLE_LABELS = {
  clear_purpose: 'Clear purpose',
  starts_with_the_reader: 'Starts with the reader',
  task_focused_structure: 'Task-focused structure',
  plain_english: 'Plain English',
  multiple_formats: 'Multiple formats',
  decision_led: 'Decision-led',
  scan_friendly: 'Scan-friendly',
  accessible_by_default: 'Accessible by default',
  consistent: 'Consistent',
  usable_under_pressure: 'Usable under pressure'
}

const RATING_TAGS = {
  fully_applied: { text: 'Fully applied', classes: 'govuk-tag--green' },
  partly_applied: { text: 'Partly applied', classes: 'govuk-tag--yellow' },
  not_applied: { text: 'Not applied', classes: 'govuk-tag--red' }
}

function _principleLabel (principle) {
  return PRINCIPLE_LABELS[principle] ?? principle
}

function _capitalise (value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}

/**
 * Map the review findings into the normalised shape shared with the detail
 * page. The stable `id` is the finding's position in the result's list.
 * Each finding names its principle (in the list hint and as a detail row)
 * so the evidence behind a principle's rating is traceable.
 *
 * @param {object} result
 * @returns {object[]}
 */
function normaliseFindings (result) {
  return (result.findings ?? []).map((finding, id) => ({
    id,
    title: finding.issue,
    location: `${finding.section} · ${_principleLabel(finding.principle)}`,
    severity: finding.severity,
    sections: [
      { heading: 'Principle', body: _principleLabel(finding.principle) },
      ...(finding.quote
        ? [{ heading: 'In the document', body: finding.quote, isQuote: true }]
        : []),
      { heading: 'Why it matters', body: finding.why_it_matters },
      { heading: 'Recommendation', body: finding.recommendation },
      ...(finding.confidence
        ? [{ heading: 'Confidence', body: _capitalise(finding.confidence) }]
        : [])
    ]
  }))
}

/**
 * One row per principle, in a fixed order, each carrying the display label
 * and a colour-coded tag. The evidence behind an amber or red rating lives
 * in the findings for that principle.
 *
 * @param {object} ratings - result.principle_ratings
 * @returns {object[]}
 */
function _principleRatings (ratings) {
  return Object.entries(PRINCIPLE_LABELS).map(([key, label]) => {
    const rating = ratings?.[key]
    return {
      label,
      tag: RATING_TAGS[rating] ?? { text: rating ?? 'Not rated', classes: 'govuk-tag--grey' }
    }
  })
}

/**
 * @param {object} result - The review response payload.
 * @param {string} documentId
 * @param {string} jobId
 * @returns {object}
 */
function resultsViewModel (result, documentId, jobId) {
  const findings = normaliseFindings(result)
  const groups = buildSeverityGroups(
    findings,
    (id) => `/content-review/${documentId}/results/${id}`
  )

  const goodPoints = (result.good_points ?? []).map((point) => ({
    label: _principleLabel(point.principle),
    quote: point.quote,
    comment: point.comment
  }))

  return {
    pageTitle: result.document_title,
    page: 'content-review',
    documentTitle: result.document_title,
    jobId,
    usability: result.usability,
    taskContextRows: [
      { key: { text: 'Task' }, value: { text: result.task_context.task } },
      { key: { text: 'User' }, value: { text: result.task_context.user } },
      {
        key: { text: 'When and how it is used' },
        value: { text: result.task_context.usage_context }
      }
    ],
    principleRatings: _principleRatings(result.principle_ratings),
    hasFindings: findings.length > 0,
    totalFindings: findings.length,
    severityRows: severitySummaryRows(findings),
    importantItems: groups.important,
    suggestionItems: groups.suggestions,
    goodPoints,
    usage: result.usage ?? null,
    breadcrumbs: [
      ...contentReviewBreadcrumbs(),
      { text: result.document_title, href: '#' }
    ]
  }
}

export {
  resultsViewModel,
  normaliseFindings
}
