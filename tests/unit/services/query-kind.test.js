import { describe, test, expect } from 'vitest'

import { isQuestion } from '../../../src/services/query-kind.js'

describe('#isQuestion', () => {
  test.each([
    'How do I check SDA status?',
    'what is a land use code',
    'Can a claimant swap options mid-year',
    'Does AB5 need an options map',
    'is moorland eligible',
    'Should I close the case',
    'SDA status?',
    '  Why   was the claim rejected  '
  ])('Should take "%s" as a question the AI search can answer', (query) => {
    expect(isQuestion(query)).toBe(true)
  })

  test.each([
    'sda status',
    'AB5 moorland',
    'land use claimant contact',
    'howling',
    'whatever',
    'what',
    ''
  ])('Should take "%s" as words to find', (query) => {
    expect(isQuestion(query)).toBe(false)
  })
})
