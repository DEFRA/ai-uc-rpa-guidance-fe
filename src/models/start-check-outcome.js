class StartCheckOutcome {
  static success (jobId, apiResponse) { return new StartCheckOutcome(jobId, null, apiResponse) }
  static conflict () { return new StartCheckOutcome(null, 'conflict', null) }
  static notFound () { return new StartCheckOutcome(null, 'not_found', null) }

  constructor (jobId, reason, apiResponse) {
    this.jobId = jobId
    this.reason = reason
    this._apiResponse = apiResponse
  }

  get succeeded () { return this.reason === null }
}

export { StartCheckOutcome }
