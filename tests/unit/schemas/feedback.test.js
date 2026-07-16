import { feedbackPayloadSchema } from '../../../src/schemas/feedback.js'

describe('#feedbackPayloadSchema', () => {
  test.each(['fix', 'wont_fix', 'false_positive'])('Should accept verdict "%s" with no comment', (verdict) => {
    const { error, value } = feedbackPayloadSchema.validate({ verdict })

    expect(error).toBeUndefined()
    expect(value.verdict).toBe(verdict)
  })

  test('Should accept a verdict with a comment up to 500 characters', () => {
    const comment = 'a'.repeat(500)

    const { error, value } = feedbackPayloadSchema.validate({ verdict: 'wont_fix', comment })

    expect(error).toBeUndefined()
    expect(value.comment).toBe(comment)
  })

  test('Should trim comment whitespace', () => {
    const { error, value } = feedbackPayloadSchema.validate({ verdict: 'wont_fix', comment: '  needs work  ' })

    expect(error).toBeUndefined()
    expect(value.comment).toBe('needs work')
  })

  test('Should allow an empty or null comment', () => {
    expect(feedbackPayloadSchema.validate({ verdict: 'fix', comment: '' }).error).toBeUndefined()
    expect(feedbackPayloadSchema.validate({ verdict: 'fix', comment: null }).error).toBeUndefined()
  })

  test('Should reject a missing verdict', () => {
    const { error } = feedbackPayloadSchema.validate({ comment: 'test' })

    expect(error).toBeDefined()
    expect(error.message).toContain('verdict')
  })

  test('Should reject an unknown verdict', () => {
    const { error } = feedbackPayloadSchema.validate({ verdict: 'not_a_real_verdict' })

    expect(error).toBeDefined()
  })

  test('Should reject a comment longer than 500 characters', () => {
    const comment = 'a'.repeat(501)

    const { error } = feedbackPayloadSchema.validate({ verdict: 'wont_fix', comment })

    expect(error).toBeDefined()
    expect(error.message).toContain('500')
  })
})
