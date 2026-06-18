class CheckResultsOutcome {
  static success (result, apiResponse) { return new CheckResultsOutcome(result, null, apiResponse) }
  static notFound () { return new CheckResultsOutcome(null, 'not_found', null) }

  constructor (result, reason, apiResponse) {
    this.result = result
    this.reason = reason
    this._apiResponse = apiResponse
  }

  get succeeded () { return this.reason === null }
}

export { CheckResultsOutcome }
