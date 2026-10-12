import { vi, describe, test, expect, beforeEach } from 'vitest'

import * as guidanceApi from '../../../src/infra/api/guidance-api.js'
import { searchGuideSections } from '../../../src/services/keyword-search.js'

vi.mock('../../../src/infra/api/guidance-api.js')

const LAND = '11111111-1111-1111-1111-111111111111'
const LETTERS = '22222222-2222-2222-2222-222222222222'

const manifest = {
  'land-guide': { documentId: LAND, title: 'Land Guide' },
  'letters-guide': { documentId: LETTERS, title: 'Letters Guide' }
}

const sections = {
  [LAND]: [
    { number: '1', heading: 'Land checks', level: 1, markdown: '## 1 Land checks\n\nCheck the **land** use, then the land cover.\n' },
    { number: '1.1', heading: 'Scope', level: 2, markdown: '### 1.1 Scope\n\nWho it is for, because users ask.\n' }
  ],
  [LETTERS]: [
    { number: 'annex-a', heading: 'Annex A', level: 1, markdown: '## Annex A\n\nSend a letter about the land. It goes by post.\n' }
  ]
}

describe('#searchGuideSections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    guidanceApi.getPrototypeGuidesManifest.mockResolvedValue({ ok: true, data: manifest })
    guidanceApi.getPrototypeGuideSections.mockImplementation(async (documentId) => ({
      ok: true,
      data: { introduction: '# Title\n\nAbout land.\n', sections: sections[documentId] }
    }))
  })

  test('Should list each section holding the words, the most matches first', async () => {
    const results = await searchGuideSections('land')

    expect(results.map((result) => [result.documentTitle, result.sectionNumber, result.matches])).toEqual([
      ['Land Guide', '1', 3],
      ['Letters Guide', 'annex-a', 1]
    ])
  })

  test('Should match one word only as a whole word', async () => {
    const results = await searchGuideSections('use')

    expect(results.map((result) => [result.sectionNumber, result.matches])).toEqual([['1', 1]])
  })

  test('Should match several words only as that whole phrase, across Markdown', async () => {
    const results = await searchGuideSections('Land Use')

    expect(results.map((result) => [result.sectionNumber, result.matches])).toEqual([['1', 1]])
  })

  test('Should not run a phrase on from a heading into the text below it', async () => {
    expect(await searchGuideSections('checks check')).toEqual([])
  })

  test('Should keep the order of the guides and their sections where the counts are the same', async () => {
    const results = await searchGuideSections('it')

    expect(results.map((result) => result.sectionNumber)).toEqual(['1.1', 'annex-a'])
  })

  test('Should say which guide and section each result is', async () => {
    const [first] = await searchGuideSections('cover')

    expect(first).toEqual(expect.objectContaining({
      documentId: LAND,
      documentTitle: 'Land Guide',
      sectionNumber: '1',
      heading: 'Land checks'
    }))
  })

  test('Should show the first sentence holding a match, with the matches marked, without Markdown', async () => {
    const [first] = await searchGuideSections('cover')

    expect(first.snippet).toEqual([
      { text: 'Check the land use, then the land ', match: false },
      { text: 'cover', match: true },
      { text: '.', match: false }
    ])
  })

  test('Should show a sentence of the section\'s text before its heading', async () => {
    const [first] = await searchGuideSections('land')

    expect(first.snippet.filter((part) => part.match).map((part) => part.text)).toEqual(['land', 'land'])
  })

  test('Should show the heading when only the heading holds a match', async () => {
    const [first] = await searchGuideSections('scope')

    expect(first.snippet).toEqual([
      { text: '1.1 ', match: false },
      { text: 'Scope', match: true }
    ])
  })

  test('Should show only the sentence holding the match', async () => {
    const [first] = await searchGuideSections('post')

    expect(first.snippet.map((part) => part.text).join('')).toBe('It goes by post.')
  })

  test('Should find nothing when no section holds the words', async () => {
    expect(await searchGuideSections('bovine')).toEqual([])
  })

  test('Should leave out a guide whose sections cannot be read', async () => {
    guidanceApi.getPrototypeGuideSections.mockImplementation(async (documentId) =>
      documentId === LAND ? { ok: false } : { ok: true, data: { introduction: '', sections: sections[documentId] } }
    )

    const results = await searchGuideSections('land')

    expect(results.map((result) => result.documentTitle)).toEqual(['Letters Guide'])
  })
})
