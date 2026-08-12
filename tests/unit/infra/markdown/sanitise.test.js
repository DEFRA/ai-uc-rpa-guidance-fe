import { describe, test, expect } from 'vitest'

import { sanitiseGuidanceHtml } from '../../../../src/infra/markdown/sanitise.js'

describe('#sanitiseGuidanceHtml', () => {
  describe('blocks injection', () => {
    test('Should remove script elements', () => {
      const result = sanitiseGuidanceHtml('<p class="govuk-body">Hi</p><script>alert(1)</script>')

      expect(result).not.toContain('<script')
      expect(result).not.toContain('alert(1)')
      expect(result).toContain('<p class="govuk-body">Hi</p>')
    })

    test('Should strip event handler attributes', () => {
      const result = sanitiseGuidanceHtml('<img class="guidance-image" src="/a.png" alt="a" onerror="alert(1)" />')

      expect(result).not.toContain('onerror')
      expect(result).toContain('src="/a.png"')
    })

    test('Should strip a javascript: href', () => {
      const result = sanitiseGuidanceHtml('<a class="govuk-link" href="javascript:alert(1)">x</a>')

      expect(result).not.toContain('javascript:')
    })

    test('Should remove iframes', () => {
      expect(sanitiseGuidanceHtml('<iframe src="https://evil.test"></iframe>')).not.toContain('<iframe')
    })

    test('Should remove form controls that document text can smuggle in', () => {
      // Guidance text like "v<input the version number>" is parsed by marked as a
      // real <input> tag, which put a stray text box in the middle of the page.
      const result = sanitiseGuidanceHtml('<p class="govuk-body">v<input the version number of the guide used></p>')

      expect(result).not.toContain('<input')
    })

    test('Should remove style elements', () => {
      expect(sanitiseGuidanceHtml('<style>body{display:none}</style>')).not.toContain('<style')
    })
  })

  describe('preserves what the govuk renderer emits', () => {
    test('Should keep heading classes and ids', () => {
      const html = '<h3 class="govuk-heading-m" id="overview">Overview</h3>'

      expect(sanitiseGuidanceHtml(html)).toBe(html)
    })

    test('Should keep paragraphs with govuk classes', () => {
      const html = '<p class="govuk-body">Text.</p>'

      expect(sanitiseGuidanceHtml(html)).toBe(html)
    })

    test('Should keep external link attributes and the visually hidden hint', () => {
      const html = '<a class="govuk-link" href="https://gov.uk" target="_blank" rel="noopener noreferrer">GOV.UK<span class="govuk-visually-hidden"> (opens in new tab)</span></a>'

      expect(sanitiseGuidanceHtml(html)).toBe(html)
    })

    test('Should keep relative internal links', () => {
      const html = '<a class="govuk-link" href="/guidance-documents/doc-1/sections/1.2">Section 1.2</a>'

      expect(sanitiseGuidanceHtml(html)).toBe(html)
    })

    test('Should keep in-page anchor links', () => {
      const html = '<a class="govuk-link" href="#_Toc123">Jump</a>'

      expect(sanitiseGuidanceHtml(html)).toBe(html)
    })

    test('Should keep guidance images with their relative src', () => {
      const html = '<img class="guidance-image" src="/guidance-documents/doc-1/assets/img_1.png" alt="Diagram" />'
      const result = sanitiseGuidanceHtml(html)

      expect(result).toContain('class="guidance-image"')
      expect(result).toContain('src="/guidance-documents/doc-1/assets/img_1.png"')
      expect(result).toContain('alt="Diagram"')
    })

    test('Should keep lists with govuk classes', () => {
      const html = '<ul class="govuk-list govuk-list--bullet"><li>One</li></ul>'

      expect(sanitiseGuidanceHtml(html)).toBe(html)
    })

    test('Should keep table markup including scope', () => {
      const html = '<table class="govuk-table"><thead class="govuk-table__head"><tr class="govuk-table__row"><th class="govuk-table__header" scope="col">A</th></tr></thead><tbody class="govuk-table__body"><tr class="govuk-table__row"><td class="govuk-table__cell">1</td></tr></tbody></table>'

      expect(sanitiseGuidanceHtml(html)).toBe(html)
    })

    test('Should keep inline emphasis that source documents use', () => {
      const html = '<strong>Note</strong>: <em>check</em> this'

      expect(sanitiseGuidanceHtml(html)).toBe(html)
    })

    test('Should keep line breaks', () => {
      expect(sanitiseGuidanceHtml('a<br />b')).toContain('<br />')
    })
  })
})
