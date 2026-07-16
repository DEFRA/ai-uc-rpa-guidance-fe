class FindingDetailOutcome {
  static notFound () { return new FindingDetailOutcome({ reason: 'not_found' }) }
  static loaded (jobId, result, feedback) {
    return new FindingDetailOutcome({ jobId, result, feedback, reason: null })
  }

  static submitted () { return new FindingDetailOutcome({ reason: 'submitted' }) }
  static alreadySubmitted (jobId, result, feedback) {
    return new FindingDetailOutcome({ jobId, result, feedback, reason: 'already_submitted' })
  }

  constructor ({ jobId = null, result = null, feedback = null, reason }) {
    this.jobId = jobId
    this.result = result
    this.feedback = feedback
    this.reason = reason
  }

  get succeeded () { return this.reason !== 'not_found' }
  get alreadySubmitted () { return this.reason === 'already_submitted' }
}

export { FindingDetailOutcome }
