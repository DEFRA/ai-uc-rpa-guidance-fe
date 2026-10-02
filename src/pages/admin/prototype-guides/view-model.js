import { colouredText } from '../../../infra/markdown/coloured-text.js'
import { createMarkdown } from '../../../infra/markdown/markdown.js'
import { govukRenderer } from '../../../infra/markdown/govuk-renderer.js'
import { sanitiseGuidanceHtml } from '../../../infra/markdown/sanitise.js'
import { homeCrumb } from '../../common/breadcrumbs.js'

const LIST_HREF = '/admin/prototype-guides'
const LIST_TITLE = 'Prototype guidance admin'

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

// Both dates are optional in the manifest; a guide's own are preferred, then
// its latest version's, since older manifests carry only some of them.

/**
 * @param {object} guide A manifest entry.
 * @returns {string}
 */
function createdOf (guide) {
  return formatDate(guide.createdAt ?? guide.versions?.[0]?.createdAt)
}

/**
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
 * @param {object[]} guides Manifest entries, each with its `name`.
 * @param {{ purged?: number, uploaded?: boolean }} [outcome]
 * @returns {object}
 */
function prototypeGuidesViewModel (guides, outcome = {}) {
  return {
    pageTitle: LIST_TITLE,
    notification: notificationFor(outcome),
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
 * @param {{ guide: object, markdown: string }} params
 * @returns {object}
 */
function prototypeGuideViewModel ({ guide, markdown }) {
  const latest = latestVersionOf(guide)

  // The page prints the title itself, from the manifest, so the guide's own
  // copy of it is dropped rather than shown twice.
  const contentHtml = sanitiseGuidanceHtml(
    createMarkdown()
      .use(govukRenderer())
      .use(colouredText())
      .render(toBrowserAssetPaths(markdown.replace(LEADING_TITLE, ''), guide.documentId))
  )

  return {
    pageTitle: `${guide.title} - ${LIST_TITLE}`,
    title: guide.title,
    contentHtml,
    details: [
      { key: { text: 'Manifest name' }, value: { text: guide.name } },
      { key: { text: 'Document ID' }, value: { text: guide.documentId } },
      { key: { text: 'Latest version' }, value: { text: `${guide.latestVersion} (${latest?.versionId ?? 'missing'})` } },
      { key: { text: 'Versions' }, value: { text: String(guide.versions?.length ?? 0) } },
      { key: { text: 'Created' }, value: { text: createdOf(guide) } },
      { key: { text: 'Updated' }, value: { text: updatedOf(guide) } },
      { key: { text: 'Sections' }, value: { text: latest ? String(latest.sections) : MISSING } },
      { key: { text: 'Images' }, value: { text: latest ? String(latest.images) : MISSING } }
    ],
    breadcrumbs: [
      homeCrumb,
      { text: LIST_TITLE, href: LIST_HREF },
      { text: guide.title }
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
  prototypeGuidesViewModel,
  prototypeGuideViewModel,
  purgeViewModel,
  uploadViewModel,
  toBrowserAssetPaths
}
