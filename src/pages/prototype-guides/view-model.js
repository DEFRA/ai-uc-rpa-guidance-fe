import { colouredText } from '../../infra/markdown/coloured-text.js'
import { createMarkdown } from '../../infra/markdown/markdown.js'
import { govukRenderer } from '../../infra/markdown/govuk-renderer.js'
import { sanitiseGuidanceHtml } from '../../infra/markdown/sanitise.js'
import { homeCrumb } from '../common/breadcrumbs.js'

const LIST_HREF = '/prototype-guides'
const LIST_TITLE = 'Prototype guidance'

// A guide reads whole, or one step (a section) at a time.
const WHOLE = 'whole'
const STEPS = 'steps'
const GUIDE_VIEWS = [WHOLE, STEPS]

// Remembers the format the reader last chose.
const GUIDE_VIEW_COOKIE = 'guideView'

// What a cell shows when the manifest has no entry for its version.
const MISSING = '-'

// The converter writes a guide's pictures relative to its content.md
// ("../assets/<digest>.png"), which only resolves against the bucket's own
// layout. This app proxies them on its own route instead.
const ASSET_REFERENCE = /(]\(|src=")(?:\.{1,2}\/)?assets\//g

// The converter opens every guide with its title as the one level-1 heading,
// and the manifest's title is read from it.
const LEADING_TITLE = /^\s*# [^\n]*\n?/

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/London'
})

/**
 * @param {string | null | undefined} value
 * @returns {string}
 */
function formatDate (value) {
  if (!value) {
    return MISSING
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date)
}

/**
 * The date is optional in the manifest; a guide's own is preferred, then its
 * latest version's, since older manifests carry only some of them.
 *
 * @param {object} guide A manifest entry.
 * @returns {string}
 */
function updatedOf (guide) {
  const latest = latestVersionOf(guide)
  return formatDate(guide.updatedAt ?? latest?.updatedAt ?? latest?.createdAt)
}

/**
 * @param {string} documentId
 * @returns {string}
 */
function guideHref (documentId) {
  // Encoded: the id comes from the manifest, and the list puts this into raw HTML.
  return `${LIST_HREF}/${encodeURIComponent(documentId)}`
}

/**
 * @param {object} guide A manifest entry.
 * @returns {object | undefined} The entry's latest version.
 */
function latestVersionOf (guide) {
  return guide.versions?.find((version) => version.version === guide.latestVersion)
}

/**
 * @param {string} markdown
 * @param {string} documentId
 * @returns {string}
 */
function toBrowserAssetPaths (markdown, documentId) {
  return markdown.replace(ASSET_REFERENCE, `$1${guideHref(documentId)}/assets/`)
}

/**
 * What the last action on the list did, for its notification banner.
 *
 * @param {{ purged?: number, uploaded?: boolean }} outcome
 * @returns {{ type?: string, html: string } | null}
 */
function notificationFor ({ purged, uploaded }) {
  if (uploaded) {
    return {
      html: '<p class="govuk-notification-banner__heading">Your zip file has been uploaded</p>' +
        '<p class="govuk-body">It is being virus scanned and unpacked. ' +
        `<a class="govuk-notification-banner__link" href="${LIST_HREF}">Refresh this page</a> ` +
        'in a minute to see the new guides.</p>'
    }
  }

  if (purged !== undefined) {
    return {
      type: 'success',
      html: '<p class="govuk-notification-banner__heading">Prototype guides purged</p>' +
        `<p class="govuk-body">${purged} file${purged === 1 ? ' was' : 's were'} deleted from the bucket.</p>`
    }
  }

  return null
}

/**
 * A section found by a keyword search, opening in its guide at that section,
 * with the guide's own search for the same words.
 *
 * @param {{ documentId: string, documentTitle: string, sectionNumber: string, heading: string, matches: number, snippet: string }} result
 * @param {string} query
 * @returns {object}
 */
function keywordResult (result, query) {
  const keywords = encodeURIComponent(query)

  return {
    label: sectionLabel({ number: result.sectionNumber, heading: result.heading }),
    documentTitle: result.documentTitle,
    snippet: result.snippet,
    matches: `${result.matches} match${result.matches === 1 ? '' : 'es'}`,
    // The section in the address as well: the stepper opens at its step.
    href: `${guideHref(result.documentId)}?keywords=${keywords}&section=${encodeURIComponent(result.sectionNumber)}` +
      `#${sectionAnchor(result.sectionNumber)}`
  }
}

/**
 * @param {object[]} guides Manifest entries, each with its `name`.
 * @param {{ purged?: number, uploaded?: boolean }} [outcome]
 * @param {{ query?: string, search?: object | null }} [searched] What was
 *   searched for, and the search, or null when nothing was asked.
 * @returns {object}
 */
function prototypeGuidesViewModel (guides, outcome = {}, { query = '', search = null } = {}) {
  return {
    pageTitle: query ? `Search results for ${query} - ${LIST_TITLE}` : LIST_TITLE,
    notification: notificationFor(outcome),
    query,
    answer: search?.kind === 'question' ? search.answer ?? null : null,
    results: search?.kind === 'question' ? search.results ?? [] : [],
    keywordResults: search?.kind === 'keywords' ? search.results.map((result) => keywordResult(result, query)) : [],
    searchKind: search?.kind ?? null,
    searched: Boolean(search),
    hasGuides: guides.length > 0,
    rows: guides.map((guide) => {
      const latest = latestVersionOf(guide)

      return [
        { html: `<a class="govuk-link" href="${guideHref(guide.documentId)}">${escapeHtml(guide.title)}</a>` },
        { text: guide.name },
        { text: String(guide.latestVersion), format: 'numeric' },
        { text: latest ? String(latest.sections) : MISSING, format: 'numeric' },
        { text: latest ? String(latest.images) : MISSING, format: 'numeric' },
        { text: updatedOf(guide) }
      ]
    }),
    breadcrumbs: [homeCrumb]
  }
}

/**
 * Render a piece of a guide's Markdown, its pictures served by this app.
 *
 * @param {string} markdown
 * @param {string} documentId
 * @returns {string} Sanitised HTML.
 */
function renderGuideMarkdown (markdown, documentId) {
  return sanitiseGuidanceHtml(
    createMarkdown()
      .use(govukRenderer())
      .use(colouredText())
      .render(toBrowserAssetPaths(markdown, documentId))
  )
}

/**
 * True for a dotted section number ("2", "2.1"), false for the slug an
 * unnumbered section is known by instead ("annex-a-case-types").
 *
 * @param {string} number
 * @returns {boolean}
 */
function isDottedNumber (number) {
  return number.split('.').every((part) => part !== '' && [...part].every((char) => char >= '0' && char <= '9'))
}

/**
 * @param {{ number: string, heading: string }} section
 * @returns {string} The section's heading, with its number when it has one.
 */
function sectionLabel (section) {
  return isDottedNumber(section.number) ? `${section.number} ${section.heading}` : section.heading
}

/**
 * @param {string} number A section's number or slug.
 * @returns {string} The id of the section's place on the page.
 */
function sectionAnchor (number) {
  return `section-${number}`
}

/**
 * The guide's steps: a step for each section, at any level, holding its own
 * text and not its subsections'. A guide without sections is one step: its
 * introduction alone.
 *
 * @param {object[]} sections
 * @returns {object[][]}
 */
function stepsOf (sections) {
  return sections.length ? sections.map((section) => [section]) : [[]]
}

/**
 * The guide's outline at every depth, as the contents list draws it: each
 * section under the last one above its level. A skipped level is not made up,
 * so a subsection straight after a top-level section is its child.
 *
 * @param {object[]} sections
 * @param {(section: object) => string} hrefOf
 * @param {(section: object) => boolean} isCurrent
 * @returns {object[]}
 */
function outlineOf (sections, hrefOf, isCurrent) {
  const root = { children: [] }
  // The last item at each depth so far: the root, then a section per level.
  const ancestors = [root]

  for (const section of sections) {
    const item = {
      number: isDottedNumber(section.number) ? section.number : '',
      heading: section.heading,
      href: hrefOf(section),
      isCurrent: isCurrent(section),
      isOpen: true,
      children: []
    }

    ancestors.length = Math.min(section.level, ancestors.length)
    ancestors.at(-1).children.push(item)
    ancestors.push(item)
  }

  return root.children
}

/**
 * The format to show a guide in: the one the address names, else the one
 * the reader last chose (from its cookie), else the whole guide.
 *
 * @param {string | undefined} asked
 * @param {string | undefined} remembered
 * @returns {'whole' | 'steps'}
 */
function guideViewOf (asked, remembered) {
  return [asked, remembered].find((view) => GUIDE_VIEWS.includes(view)) ?? WHOLE
}

/**
 * One guide's latest version, whole or one step at a time, with its outline.
 *
 * @param {{ guide: object, introduction: string, sections: object[] }} found
 * @param {{ view?: 'whole' | 'steps', step?: number, section?: string, keywords?: string }} [options]
 *   With no step, the stepper opens at the step holding the section named,
 *   or the first.
 * @returns {object | null} Null for a step the guide does not have.
 */
function prototypeGuideViewModel ({ guide, introduction, sections }, { view = WHOLE, step: asked, section, keywords = '' } = {}) {
  const steps = stepsOf(sections)
  const stepping = view === STEPS
  const holding = steps.findIndex((stepSections) => stepSections.some((candidate) => candidate.number === section))
  const step = asked ?? Math.max(holding + 1, 1)

  if (stepping && step > steps.length) {
    return null
  }

  const stepOf = new Map(steps.flatMap((stepSections, index) =>
    stepSections.map((section) => [section.number, index + 1])
  ))
  const stepHref = (number) => `?view=steps&step=${number}`

  const hrefOf = (section) => {
    const anchor = `#${sectionAnchor(section.number)}`
    const sectionStep = stepOf.get(section.number)

    return stepping && sectionStep !== step ? `${stepHref(sectionStep)}${anchor}` : anchor
  }

  const stepLink = (number) => number >= 1 && number <= steps.length && steps[number - 1].length
    ? { href: stepHref(number), label: sectionLabel(steps[number - 1][0]) }
    : null

  const shown = stepping ? steps[step - 1] : sections

  return {
    pageTitle: `${guide.title} - ${LIST_TITLE}`,
    title: guide.title,
    keywords,
    // The page prints the title itself, from the manifest, so the guide's own
    // copy of it is dropped rather than shown twice.
    introductionHtml: !stepping || step === 1
      ? renderGuideMarkdown(introduction.replace(LEADING_TITLE, ''), guide.documentId).trim()
      : '',
    sections: shown.map((section) => ({
      anchor: sectionAnchor(section.number),
      html: renderGuideMarkdown(section.markdown, guide.documentId)
    })),
    outline: outlineOf(sections, hrefOf, (section) => stepping && stepOf.get(section.number) === step),
    views: [
      { text: 'Traditional', href: `?view=${WHOLE}`, isCurrent: !stepping },
      { text: 'Stepper', href: `?view=${STEPS}`, isCurrent: stepping }
    ],
    step: stepping
      ? { number: step, total: steps.length, previous: stepLink(step - 1), next: stepLink(step + 1) }
      : null,
    breadcrumbs: [
      homeCrumb,
      { text: LIST_TITLE, href: LIST_HREF },
      { text: guide.title }
    ]
  }
}

/**
 * The path the search index links to for a whole guide. It mirrors the API's
 * path for the guide's content, so a link the index holds opens here.
 *
 * @param {string} documentId
 * @returns {string}
 */
function guideContentHref (documentId) {
  return `/prototype/guides/${encodeURIComponent(documentId)}/content`
}

/**
 * One section of a guide's latest version, rendered, with the way into the
 * whole guide.
 *
 * @param {{ guide: object, markdown: string }} params
 * @returns {object}
 */
function prototypeGuideSectionViewModel ({ guide, markdown }) {
  return {
    pageTitle: `${guide.title} - ${LIST_TITLE}`,
    title: guide.title,
    guideHref: guideContentHref(guide.documentId),
    contentHtml: renderGuideMarkdown(markdown, guide.documentId),
    breadcrumbs: [
      homeCrumb,
      { text: guide.title, href: guideContentHref(guide.documentId) }
    ]
  }
}

/**
 * @param {object[]} guides Manifest entries.
 * @returns {object}
 */
function purgeViewModel (guides) {
  return {
    pageTitle: 'Are you sure you want to purge all prototype guides?',
    guideCount: guides.length,
    breadcrumbs: [homeCrumb, { text: LIST_TITLE, href: LIST_HREF }]
  }
}

/**
 * @param {string} uploadUrl Where the browser posts the zip.
 * @returns {object}
 */
function uploadViewModel (uploadUrl) {
  return {
    pageTitle: 'Upload prototype guides',
    uploadUrl,
    breadcrumbs: [homeCrumb, { text: LIST_TITLE, href: LIST_HREF }]
  }
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml (value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export {
  GUIDE_VIEW_COOKIE,
  GUIDE_VIEWS,
  guideViewOf,
  prototypeGuidesViewModel,
  prototypeGuideViewModel,
  prototypeGuideSectionViewModel,
  purgeViewModel,
  uploadViewModel,
  toBrowserAssetPaths
}
