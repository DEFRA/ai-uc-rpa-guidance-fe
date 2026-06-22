/** @type {Record<string, string>} */
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }

/** Fallback rank for severities not present in SEVERITY_ORDER (treated as lowest priority). */
const UNKNOWN_SEVERITY_RANK = 99

/** @type {Record<string, string>} */
const SEVERITY_TAG_CLASS = {
  critical: 'govuk-tag--red',
  high: 'govuk-tag--orange',
  medium: 'govuk-tag--yellow',
  low: 'govuk-tag--blue',
  info: 'govuk-tag--grey'
}

/** @type {Record<string, string>} */
const SEVERITY_BORDER_COLOUR = {
  critical: '#d4351c',
  high: '#f47738',
  medium: '#f2a73d',
  low: '#1d70b8',
  info: '#b1b4b6'
}

/**
 * Returns the worst (highest-priority) severity from a list of findings.
 *
 * @param {import('../infra/api/analyse.js').FindingResponse[]} findings
 * @returns {string}
 */
function worstSeverity (findings) {
  return findings.reduce((worst, f) => {
    return (SEVERITY_ORDER[f.severity] ?? UNKNOWN_SEVERITY_RANK) < (SEVERITY_ORDER[worst] ?? UNKNOWN_SEVERITY_RANK)
      ? f.severity
      : worst
  }, 'info')
}

const QUOTES = new Set(['"', "'", '`'])

function anchor (href, label) {
  return `<a href="${href}" class="govuk-link" target="_blank" rel="noopener noreferrer">${label}</a>`
}

function matchMarkdownLink (text, at) {
  if (QUOTES.has(text[at - 1])) return null
  const closeSquare = text.indexOf(']', at + 1)
  if (closeSquare === -1 || text[closeSquare + 1] !== '(') return null
  const closeParen = text.indexOf(')', closeSquare + 2)
  if (closeParen === -1 || QUOTES.has(text[closeParen + 1])) return null
  return {
    end: closeParen + 1,
    html: anchor(text.slice(closeSquare + 2, closeParen), text.slice(at + 1, closeSquare))
  }
}

function matchBareUrl (text, at) {
  if (text[at - 1] === ']') return null
  const urlStart = at + 1
  if (!text.startsWith('https://', urlStart) && !text.startsWith('http://', urlStart)) return null
  const closeParen = text.indexOf(')', urlStart)
  if (closeParen === -1) return null
  const url = text.slice(urlStart, closeParen)
  return { end: closeParen + 1, html: anchor(url, url) }
}

/**
 * Converts unquoted markdown hyperlinks and bare parenthesised URLs to HTML anchors.
 * Links surrounded by backticks, single quotes, or double quotes are left as-is.
 * Handles two formats:
 *   [anchor text](url)  →  <a href="url">anchor text</a>
 *   (url)               →  <a href="url">url</a>  (bare URL, not preceded by ])
 *
 * @param {string} text
 * @param {number} [pos]
 * @returns {string}
 */
function renderLinks (text, pos = 0) {
  const bracketPos = text.indexOf('[', pos)
  const parenPos = text.indexOf('(', pos)
  if (bracketPos === -1 && parenPos === -1) return text.slice(pos)

  const next = Math.min(
    bracketPos === -1 ? text.length : bracketPos,
    parenPos === -1 ? text.length : parenPos
  )

  const match = next === bracketPos
    ? matchMarkdownLink(text, next)
    : matchBareUrl(text, next)

  return match
    ? text.slice(pos, next) + match.html + renderLinks(text, match.end)
    : text.slice(pos, next + 1) + renderLinks(text, next + 1)
}

/**
 * Renders a single finding card as an HTML string.
 *
 * @param {import('../infra/api/analyse.js').FindingResponse} finding
 * @returns {string}
 */
function renderFindingCard (finding) {
  const tagClass = SEVERITY_TAG_CLASS[finding.severity] ?? ''
  const borderColour = SEVERITY_BORDER_COLOUR[finding.severity] ?? '#b1b4b6'

  return `
<div class="app-finding-card" style="border-left-color: ${borderColour}">
  <div class="app-finding-card__header">
    <strong class="govuk-tag ${tagClass}">${finding.severity}</strong>
    <span class="app-finding-card__section">${finding.section}</span>
  </div>
  <dl class="app-finding-card__body">
    <div class="app-finding-card__row">
      <dt>Issue</dt>
      <dd>${renderLinks(finding.issue)}</dd>
    </div>
    <div class="app-finding-card__row">
      <dt>Why it matters</dt>
      <dd>${renderLinks(finding.why_it_matters)}</dd>
    </div>
    <div class="app-finding-card__row">
      <dt>Recommendation</dt>
      <dd>${renderLinks(finding.recommendation)}</dd>
    </div>
  </dl>
</div>`.trim()
}

/**
 * Nunjucks filter: groups findings by category and returns a govuk-accordion
 * items array. Each item has `heading.html` and `content.html` pre-rendered.
 *
 * Usage in template: {{ result.findings | accordionItems | dump }}
 * (The template passes the result to govukAccordion via the controller.)
 *
 * @param {import('../infra/api/analyse.js').FindingResponse[]} findings
 * @returns {Array<{heading: {html: string}, content: {html: string}}>}
 */
function accordionItems (findings) {
  if (!Array.isArray(findings) || findings.length === 0) {
    return []
  }

  /** @type {Map<string, import('../infra/api/analyse.js').FindingResponse[]>} */
  const byCategory = new Map()

  for (const finding of findings) {
    const category = finding.category ?? 'Uncategorised'
    if (!byCategory.has(category)) {
      byCategory.set(category, [])
    }
    byCategory.get(category).push(finding)
  }

  return Array.from(byCategory.entries()).map(([category, categoryFindings]) => {
    const worst = worstSeverity(categoryFindings)
    const tagClass = SEVERITY_TAG_CLASS[worst] ?? ''
    const count = categoryFindings.length
    const countLabel = count === 1 ? 'issue' : 'issues'

    const headingHtml = `
      <span class="app-accordion-heading__category">${category}</span>
      <strong class="govuk-tag ${tagClass} app-accordion-heading__tag">${worst}</strong>
      <span class="app-accordion-heading__count govuk-body-s">${count} ${countLabel}</span>
    `.trim()

    const contentHtml = categoryFindings.map(renderFindingCard).join('\n')

    return {
      heading: { html: headingHtml },
      content: { html: contentHtml }
    }
  })
}

export {
  accordionItems,
  renderLinks,
  worstSeverity,
  SEVERITY_ORDER,
  UNKNOWN_SEVERITY_RANK,
  SEVERITY_TAG_CLASS,
  SEVERITY_BORDER_COLOUR
}
