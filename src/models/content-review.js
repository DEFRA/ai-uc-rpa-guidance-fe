class StartReviewOutcome {
  static success (jobId) { return new StartReviewOutcome(jobId, null) }
  static conflict () { return new StartReviewOutcome(null, 'conflict') }
  static notFound () { return new StartReviewOutcome(null, 'not_found') }

  constructor (jobId, reason) {
    this.jobId = jobId
    this.reason = reason
  }

  get succeeded () { return this.reason === null }
}

class ReviewResultsOutcome {
  static success (result) { return new ReviewResultsOutcome(result, null) }
  static notFound () { return new ReviewResultsOutcome(null, 'not_found') }

  constructor (result, reason) {
    this.result = result
    this.reason = reason
  }

  get succeeded () { return this.reason === null }
}

export { StartReviewOutcome, ReviewResultsOutcome }
