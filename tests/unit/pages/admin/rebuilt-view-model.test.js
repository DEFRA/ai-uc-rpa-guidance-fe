import { describe, test, expect } from 'vitest'

import { rebuiltViewModel } from '../../../../src/pages/admin/search-index/rebuilt/view-model.js'

const model = (took) => rebuiltViewModel([], { purged: 0, failed: 0, took })

describe('#rebuiltViewModel timeTaken', () => {
  test('Should read seconds alone under a minute', () => {
    expect(model(42).timeTaken).toBe('42 seconds')
  })

  test('Should read minutes and seconds together', () => {
    expect(model(110).timeTaken).toBe('1 minute 50 seconds')
  })

  test('Should drop the seconds when there are none', () => {
    expect(model(120).timeTaken).toBe('2 minutes')
  })

  test('Should say one second in the singular', () => {
    expect(model(1).timeTaken).toBe('1 second')
  })

  test('Should round to the nearest second', () => {
    expect(model(59.6).timeTaken).toBe('1 minute')
  })

  test('Should claim nothing when the rebuild was not timed', () => {
    expect(model(0).timeTaken).toBeNull()
  })
})
