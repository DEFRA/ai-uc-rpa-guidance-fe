import { describe, test, expect } from 'vitest'

import { matchesIn, searchTermOf } from '../../../src/common/keyword-matches.js'

// The matched text, for reading the expectations.
const found = (text, term) => matchesIn(text, term).map(([start, end]) => text.slice(start, end))

describe('#searchTermOf', () => {
  test('Should take the words in lower case, one space between them', () => {
    expect(searchTermOf('  Land   USE\tcodes ')).toBe('land use codes')
  })

  test('Should be empty for a blank search', () => {
    expect(searchTermOf('   ')).toBe('')
  })
})

describe('#matchesIn', () => {
  test('Should find a word only as a whole word, in any case', () => {
    expect(found('Use it, because users use it. USE.', 'use')).toEqual(['Use', 'use', 'USE'])
  })

  test('Should find several words only as that whole phrase, in any case', () => {
    expect(found('Land use, land  users, landuse, Land USE codes', 'land use')).toEqual(['Land use', 'Land USE'])
  })

  test('Should find a phrase across a line break', () => {
    expect(found('the land\n  use code', 'land use')).toEqual(['land\n  use'])
  })

  test('Should take a hyphen or other punctuation as the edge of a word', () => {
    expect(found('land-use (land) land.', 'land')).toEqual(['land', 'land', 'land'])
  })

  test('Should take digits as part of a word', () => {
    expect(found('AB5 and AB50', 'ab5')).toEqual(['AB5'])
  })

  test('Should give each match as its start and end in the text', () => {
    expect(matchesIn('Check the land.', 'land')).toEqual([[10, 14]])
  })

  test('Should find nothing for a blank search', () => {
    expect(matchesIn('land', '')).toEqual([])
  })
})
