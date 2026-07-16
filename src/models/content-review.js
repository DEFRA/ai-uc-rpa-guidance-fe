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
  static success (jobId, result) { return new ReviewResultsOutcome(jobId, result, null) }
  static notFound () { return new ReviewResultsOutcome(null, null, 'not_found') }

  constructor (jobId, result, reason) {
    this.jobId = jobId
    this.result = result
    this.reason = reason
  }

  get succeeded () { return this.reason === null }
}

export { StartReviewOutcome, ReviewResultsOutcome }
