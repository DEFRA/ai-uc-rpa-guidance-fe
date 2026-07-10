class StartCheckOutcome {
  static success (jobId) { return new StartCheckOutcome(jobId, null) }
  static conflict () { return new StartCheckOutcome(null, 'conflict') }
  static notFound () { return new StartCheckOutcome(null, 'not_found') }

  constructor (jobId, reason) {
    this.jobId = jobId
    this.reason = reason
  }

  get succeeded () { return this.reason === null }
}

class CheckResultsOutcome {
  static success (jobId, result) { return new CheckResultsOutcome(jobId, result, null) }
  static notFound () { return new CheckResultsOutcome(null, null, 'not_found') }

  constructor (jobId, result, reason) {
    this.jobId = jobId
    this.result = result
    this.reason = reason
  }

  get succeeded () { return this.reason === null }
}

export { StartCheckOutcome, CheckResultsOutcome }
