class FetchDocumentOutcome {
  static success (document, apiResponse) { return new FetchDocumentOutcome(document, null, apiResponse) }
  static notFound () { return new FetchDocumentOutcome(null, 'not_found', null) }

  constructor (document, reason, apiResponse) {
    this.document = document
    this.reason = reason
    this._apiResponse = apiResponse
  }

  get succeeded () { return this.reason === null }
}

export { FetchDocumentOutcome }
