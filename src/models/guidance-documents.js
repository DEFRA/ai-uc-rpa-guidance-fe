class FetchDocumentOutcome {
  static success (document) { return new FetchDocumentOutcome(document, null) }
  static notFound () { return new FetchDocumentOutcome(null, 'not_found') }

  constructor (document, reason) {
    this.document = document
    this.reason = reason
  }

  get succeeded () { return this.reason === null }
}

export { FetchDocumentOutcome }
