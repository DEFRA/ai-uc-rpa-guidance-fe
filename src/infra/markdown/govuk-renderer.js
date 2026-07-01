const HEADING_CLASSES = {
  1: 'govuk-heading-xl',
  2: 'govuk-heading-l',
  3: 'govuk-heading-m',
  4: 'govuk-heading-s'
}

// Matches an absolute URI with a scheme (e.g. `https:`, `mailto:`) or a
// protocol-relative URL (`//host`). Deliberately does not match `#anchor`
// fragments or `/relative` paths, so internal links are left untouched.
const EXTERNAL_HREF = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i

/**
 * A `marked` extension whose renderer applies GOV.UK Frontend classes to the
 * generated HTML, so rendered guidance content matches the rest of the service.
 *
 * Uses marked's token-object renderer signatures (marked v5+). The pipeline
 * applies this before any `walkTokens` transforms registered later.
 *
 * @returns {{ renderer: object }}
 */
function govukRenderer () {
  return {
    renderer: {
      heading (token) {
        const className = HEADING_CLASSES[token.depth] || 'govuk-heading-s'
        return `<h${token.depth} class="${className}">${this.parser.parseInline(token.tokens)}</h${token.depth}>\n`
      },

      paragraph (token) {
        return `<p class="govuk-body">${this.parser.parseInline(token.tokens)}</p>\n`
      },

      link (token) {
        const titleAttr = token.title ? ` title="${token.title}"` : ''
        const isExternal = EXTERNAL_HREF.test(token.href ?? '')
        const externalAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''
        const externalHint = isExternal
          ? '<span class="govuk-visually-hidden"> (opens in new tab)</span>'
          : ''
        return `<a class="govuk-link" href="${token.href}"${titleAttr}${externalAttrs}>${this.parser.parseInline(token.tokens)}${externalHint}</a>`
      },

      list (token) {
        const tag = token.ordered ? 'ol' : 'ul'
        const modifier = token.ordered ? 'govuk-list--number' : 'govuk-list--bullet'
        const items = token.items.map((item) => this.listitem(item)).join('')
        return `<${tag} class="govuk-list ${modifier}">${items}</${tag}>\n`
      },

      listitem (item) {
        return `<li>${this.parser.parse(item.tokens, !!item.loose)}</li>`
      },

      image (token) {
        const alt = token.text ?? ''
        return `<img class="guidance-image" src="${token.href}" alt="${alt}" />\n`
      },

      table (token) {
        const cell = (c, tag, className, scope) =>
          `<${tag} class="${className}"${scope}>${this.parser.parseInline(c.tokens)}</${tag}>`

        const head = token.header
          .map((c) => cell(c, 'th', 'govuk-table__header', ' scope="col"'))
          .join('')
        const body = token.rows
          .map((row) => {
            const cells = row
              .map((c) => cell(c, 'td', 'govuk-table__cell', ''))
              .join('')
            return `<tr class="govuk-table__row">${cells}</tr>`
          })
          .join('')
        return (
          '<table class="govuk-table">' +
          `<thead class="govuk-table__head"><tr class="govuk-table__row">${head}</tr></thead>` +
          `<tbody class="govuk-table__body">${body}</tbody>` +
          '</table>\n'
        )
      }
    }
  }
}

export { govukRenderer }
