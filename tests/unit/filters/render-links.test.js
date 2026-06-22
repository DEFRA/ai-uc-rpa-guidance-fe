import { describe, test, expect } from 'vitest'
import { renderLinks } from '../../../src/filters/render-links.js'

describe('#renderLinks', () => {
  const anchor = (href, label) =>
    `<a href="${href}" class="govuk-link" target="_blank" rel="noopener noreferrer">${label}</a>`

  test('Should return plain text unchanged', () => {
    expect(renderLinks('no links here')).toBe('no links here')
  })

  test('Should return an empty string unchanged', () => {
    expect(renderLinks('')).toBe('')
  })

  test('Should convert a markdown link to an anchor', () => {
    expect(renderLinks('[click here](https://example.com)')).toBe(
      anchor('https://example.com', 'click here')
    )
  })

  test('Should convert a bare https URL in parens to an anchor', () => {
    expect(renderLinks('(https://example.com)')).toBe(
      anchor('https://example.com', 'https://example.com')
    )
  })

  test('Should convert a bare http URL in parens to an anchor', () => {
    expect(renderLinks('(http://example.com)')).toBe(
      anchor('http://example.com', 'http://example.com')
    )
  })

  test('Should leave a markdown link preceded by a backtick unchanged', () => {
    const input = '`[click here](https://example.com)`'
    expect(renderLinks(input)).toBe(input)
  })

  test('Should leave a markdown link preceded by a single quote unchanged', () => {
    const input = "'[click here](https://example.com)'"
    expect(renderLinks(input)).toBe(input)
  })

  test('Should leave a markdown link preceded by a double quote unchanged', () => {
    const input = '"[click here](https://example.com)"'
    expect(renderLinks(input)).toBe(input)
  })

  test('Should leave a markdown link followed by a double quote unchanged', () => {
    expect(renderLinks('[click here](https://example.com)"')).toBe(
      '[click here](https://example.com)"'
    )
  })

  test('Should convert multiple markdown links in the same string', () => {
    const input = '[first](https://a.com) and [second](https://b.com)'
    expect(renderLinks(input)).toBe(
      `${anchor('https://a.com', 'first')} and ${anchor('https://b.com', 'second')}`
    )
  })

  test('Should convert both a markdown link and a bare URL in the same string', () => {
    const input = 'See [docs](https://docs.example.com) or (https://alt.example.com)'
    expect(renderLinks(input)).toBe(
      `See ${anchor('https://docs.example.com', 'docs')} or ${anchor('https://alt.example.com', 'https://alt.example.com')}`
    )
  })

  test('Should not convert a bare URL preceded by ]', () => {
    expect(renderLinks('foo](https://example.com)')).toBe('foo](https://example.com)')
  })

  test('Should preserve surrounding text', () => {
    expect(renderLinks('Visit [our site](https://example.com) for more info.')).toBe(
      `Visit ${anchor('https://example.com', 'our site')} for more info.`
    )
  })
})
